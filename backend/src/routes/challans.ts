import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { z } from 'zod';

import { pool, query } from '../db';
import {
  requireAuth,
  requireRoles,
  AuthedRequest,
} from '../middleware/auth';

const r = Router();

r.use(requireAuth);

// ============================================================
// VALIDATION
// ============================================================

const item = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

const create = z.object({
  customer_id: z.string().uuid(),

  items: z.array(item).min(1),

  status: z
    .enum(['Draft', 'Confirmed'])
    .default('Draft'),
});

// ============================================================
// GENERATE CHALLAN NUMBER
// ============================================================

async function nextNumber(client: any) {
  const result = await client.query(
    "SELECT COUNT(*) + 1 AS n FROM challans"
  );

  return `CHL-2026-${String(result.rows[0].n).padStart(5, '0')}`;
}

// ============================================================
// GET ALL CHALLANS
// ============================================================

r.get(
  '/',
  async (_req, res, next) => {
    try {
      const q = await query(
        `
        SELECT
          c.*,
          cu.name customer_name,
          u.name created_by_name
        FROM challans c
        JOIN customers cu
          ON cu.id = c.customer_id
        LEFT JOIN users u
          ON u.id = c.created_by
        ORDER BY c.created_at DESC
        LIMIT 100
        `
      );

      res.json(q.rows);
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// GET SINGLE CHALLAN
// ============================================================

r.get(
  '/:id',
  async (req, res, next) => {
    try {
      const c = await query<any>(
        `
        SELECT
          c.*,
          cu.name customer_name
        FROM challans c
        JOIN customers cu
          ON cu.id = c.customer_id
        WHERE c.id = $1
        `,
        [req.params.id]
      );

      if (!c.rowCount) {
        return res
          .status(404)
          .json({
            message: 'Challan not found',
          });
      }

      const i = await query(
        `
        SELECT *
        FROM challan_items
        WHERE challan_id = $1
        `,
        [req.params.id]
      );

      res.json({
        ...c.rows[0],
        items: i.rows,
      });
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// CREATE CHALLAN
// ============================================================

r.post(
  '/',
  requireRoles('Admin', 'Sales'),
  async (
    req: AuthedRequest,
    res,
    next
  ) => {
    const client = await pool.connect();

    try {
      const b = create.parse(req.body);

      await client.query('BEGIN');

      // ------------------------------------------------------
      // CHECK CUSTOMER
      // ------------------------------------------------------

      const customer =
        await client.query(
          `
          SELECT id
          FROM customers
          WHERE id = $1
          `,
          [b.customer_id]
        );

      if (!customer.rowCount) {
        throw Object.assign(
          new Error('Customer not found'),
          {
            status: 404,
          }
        );
      }

      // ------------------------------------------------------
      // GENERATE CHALLAN NUMBER
      // ------------------------------------------------------

      const number =
        await nextNumber(client);

      let total = 0;

      const products: any[] = [];

      // ------------------------------------------------------
      // CHECK PRODUCTS
      // ------------------------------------------------------

      for (const item of b.items) {
        const p =
          await client.query<any>(
            `
            SELECT *
            FROM products
            WHERE id = $1
            FOR UPDATE
            `,
            [item.product_id]
          );

        if (!p.rowCount) {
          throw Object.assign(
            new Error('Product not found'),
            {
              status: 404,
            }
          );
        }

        // Check stock when creating Confirmed challan
        if (
          b.status === 'Confirmed' &&
          p.rows[0].current_stock <
            item.quantity
        ) {
          throw Object.assign(
            new Error(
              `Insufficient stock for ${p.rows[0].name}`
            ),
            {
              status: 400,
            }
          );
        }

        products.push({
          p: p.rows[0],
          quantity: item.quantity,
        });

        total += item.quantity;
      }

      // ------------------------------------------------------
      // CREATE CHALLAN
      // ------------------------------------------------------

      const c =
        await client.query<any>(
          `
          INSERT INTO challans
          (
            challan_number,
            customer_id,
            total_quantity,
            status,
            created_by
          )
          VALUES
          ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [
            number,
            b.customer_id,
            total,
            b.status,
            req.user!.id,
          ]
        );

      // ------------------------------------------------------
      // CREATE CHALLAN ITEMS
      // ------------------------------------------------------

      for (const x of products) {
        await client.query(
          `
          INSERT INTO challan_items
          (
            challan_id,
            product_id,
            product_name_snapshot,
            sku_snapshot,
            unit_price_snapshot,
            quantity
          )
          VALUES
          ($1, $2, $3, $4, $5, $6)
          `,
          [
            c.rows[0].id,
            x.p.id,
            x.p.name,
            x.p.sku,
            x.p.unit_price,
            x.quantity,
          ]
        );

        // ----------------------------------------------------
        // REDUCE STOCK FOR CONFIRMED CHALLAN
        // ----------------------------------------------------

        if (b.status === 'Confirmed') {
          await client.query(
            `
            UPDATE products
            SET
              current_stock =
                current_stock - $1,
              updated_at = NOW()
            WHERE id = $2
            `,
            [
              x.quantity,
              x.p.id,
            ]
          );

          // --------------------------------------------------
          // STOCK MOVEMENT
          // --------------------------------------------------

          await client.query(
            `
            INSERT INTO stock_movements
            (
              product_id,
              quantity_changed,
              movement_type,
              reason,
              created_by
            )
            VALUES
            ($1, $2, 'OUT', $3, $4)
            `,
            [
              x.p.id,
              x.quantity,
              `Sales challan ${number}`,
              req.user!.id,
            ]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...c.rows[0],

        items: products.map(
          (x) => ({
            product_id: x.p.id,

            product_name_snapshot:
              x.p.name,

            sku_snapshot:
              x.p.sku,

            unit_price_snapshot:
              x.p.unit_price,

            quantity:
              x.quantity,
          })
        ),
      });
    } catch (e) {
      await client.query('ROLLBACK');

      next(e);
    } finally {
      client.release();
    }
  }
);

// ============================================================
// CONFIRM DRAFT CHALLAN
// ============================================================

r.post(
  '/:id/confirm',
  requireRoles('Admin', 'Sales'),
  async (
    req,
    res,
    next
  ) => {
    const client =
      await pool.connect();

    try {
      await client.query('BEGIN');

      // ------------------------------------------------------
      // LOCK CHALLAN
      // ------------------------------------------------------

      const c =
        await client.query<any>(
          `
          SELECT *
          FROM challans
          WHERE id = $1
          FOR UPDATE
          `,
          [req.params.id]
        );

      if (!c.rowCount) {
        return res
          .status(404)
          .json({
            message:
              'Challan not found',
          });
      }

      if (
        c.rows[0].status !==
        'Draft'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Only draft challans can be confirmed',
          });
      }

      // ------------------------------------------------------
      // GET ITEMS
      // ------------------------------------------------------

      const items =
        await client.query<any>(
          `
          SELECT *
          FROM challan_items
          WHERE challan_id = $1
          `,
          [req.params.id]
        );

      // ------------------------------------------------------
      // REDUCE STOCK
      // ------------------------------------------------------

      for (const i of items.rows) {
        const p =
          await client.query<any>(
            `
            SELECT *
            FROM products
            WHERE id = $1
            FOR UPDATE
            `,
            [i.product_id]
          );

        if (
          p.rows[0].current_stock <
          i.quantity
        ) {
          throw Object.assign(
            new Error(
              `Insufficient stock for ${i.product_name_snapshot}`
            ),
            {
              status: 400,
            }
          );
        }

        await client.query(
          `
          UPDATE products
          SET
            current_stock =
              current_stock - $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            i.quantity,
            i.product_id,
          ]
        );

        // ----------------------------------------------------
        // STOCK MOVEMENT
        // ----------------------------------------------------

        await client.query(
          `
          INSERT INTO stock_movements
          (
            product_id,
            quantity_changed,
            movement_type,
            reason,
            created_by
          )
          VALUES
          ($1, $2, 'OUT', $3, $4)
          `,
          [
            i.product_id,
            i.quantity,
            `Sales challan ${c.rows[0].challan_number}`,
            (req as AuthedRequest)
              .user!.id,
          ]
        );
      }

      // ------------------------------------------------------
      // UPDATE STATUS
      // ------------------------------------------------------

      const out =
        await client.query(
          `
          UPDATE challans
          SET status = 'Confirmed'
          WHERE id = $1
          RETURNING *
          `,
          [req.params.id]
        );

      await client.query('COMMIT');

      res.json(
        out.rows[0]
      );
    } catch (e) {
      await client.query(
        'ROLLBACK'
      );

      next(e);
    } finally {
      client.release();
    }
  }
);

// ============================================================
// GENERATE INVOICE PDF
// ============================================================

r.get(
  '/:id/invoice/pdf',
  async (
    req: AuthedRequest,
    res,
    next
  ) => {
    try {
      // ------------------------------------------------------
      // GET CHALLAN + CUSTOMER DETAILS
      // ------------------------------------------------------

      const challan =
        await query<any>(
          `
          SELECT
            c.*,

            cu.name AS customer_name,
            cu.mobile AS customer_mobile,
            cu.email AS customer_email,
            cu.business_name AS customer_business_name,
            cu.gst_number AS customer_gst_number,
            cu.address AS customer_address,

            u.name AS created_by_name

          FROM challans c

          JOIN customers cu
            ON cu.id = c.customer_id

          LEFT JOIN users u
            ON u.id = c.created_by

          WHERE c.id = $1
          `,
          [req.params.id]
        );

      // ------------------------------------------------------
      // CHECK CHALLAN
      // ------------------------------------------------------

      if (!challan.rowCount) {
        return res
          .status(404)
          .json({
            message:
              'Challan not found',
          });
      }

      const data =
        challan.rows[0];

      // ------------------------------------------------------
      // ONLY CONFIRMED CHALLANS
      // ------------------------------------------------------

      if (
        data.status !==
        'Confirmed'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invoice can only be generated for a confirmed challan.',
          });
      }

      // ------------------------------------------------------
      // GET CHALLAN ITEMS
      // ------------------------------------------------------

      const items =
        await query<any>(
          `
          SELECT
            product_name_snapshot,
            sku_snapshot,
            unit_price_snapshot,
            quantity

          FROM challan_items

          WHERE challan_id = $1

          ORDER BY product_name_snapshot
          `,
          [req.params.id]
        );

      // ------------------------------------------------------
      // INVOICE NUMBER
      // ------------------------------------------------------

      const invoiceNumber =
        data.challan_number.replace(
          /^CHL-/,
          'INV-'
        );

      // ------------------------------------------------------
      // CALCULATE TOTALS
      // ------------------------------------------------------

      let grandTotal = 0;

      let totalQuantity = 0;

      for (
        const item of items.rows
      ) {
        const quantity =
          Number(
            item.quantity
          );

        const unitPrice =
          Number(
            item.unit_price_snapshot
          );

        grandTotal +=
          quantity *
          unitPrice;

        totalQuantity +=
          quantity;
      }

      // ------------------------------------------------------
      // CREATE PDF
      // ------------------------------------------------------

      const doc =
        new PDFDocument({
          size: 'A4',
          margin: 50,
        });

      // ------------------------------------------------------
      // RESPONSE HEADERS
      // ------------------------------------------------------

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${invoiceNumber}.pdf"`
      );

      // Send PDF directly to browser
      doc.pipe(res);

      // ======================================================
      // PDF HEADER
      // ======================================================

      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(
          'MINI ERP + CRM',
          {
            align: 'center',
          }
        );

      doc
        .fontSize(18)
        .text(
          'INVOICE',
          {
            align: 'center',
          }
        );

      doc.moveDown();

      // ======================================================
      // INVOICE INFORMATION
      // ======================================================

      doc
        .fontSize(10)
        .font('Helvetica');

      doc.text(
        `Invoice No: ${invoiceNumber}`
      );

      doc.text(
        `Challan No: ${data.challan_number}`
      );

      doc.text(
        `Invoice Date: ${
          data.created_at
            ? new Date(
                data.created_at
              ).toLocaleDateString(
                'en-IN'
              )
            : '-'
        }`
      );

      doc.moveDown();

      // ======================================================
      // CUSTOMER DETAILS
      // ======================================================

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To');

      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica');

      doc.text(
        `Customer: ${
          data.customer_name ||
          '-'
        }`
      );

      if (
        data.customer_business_name
      ) {
        doc.text(
          `Business: ${data.customer_business_name}`
        );
      }

      if (
        data.customer_mobile
      ) {
        doc.text(
          `Mobile: ${data.customer_mobile}`
        );
      }

      if (
        data.customer_email
      ) {
        doc.text(
          `Email: ${data.customer_email}`
        );
      }

      if (
        data.customer_gst_number
      ) {
        doc.text(
          `GST Number: ${data.customer_gst_number}`
        );
      }

      if (
        data.customer_address
      ) {
        doc.text(
          `Address: ${data.customer_address}`
        );
      }

      doc.moveDown();

      // ======================================================
      // TABLE
      // ======================================================

      const tableTop =
        doc.y;

      const colProduct = 50;
      const colSku = 250;
      const colQty = 340;
      const colPrice = 390;
      const colAmount = 465;

      // ------------------------------------------------------
      // TABLE HEADER
      // ------------------------------------------------------

      doc
        .font('Helvetica-Bold')
        .fontSize(10);

      doc.text(
        'Product',
        colProduct,
        tableTop
      );

      doc.text(
        'SKU',
        colSku,
        tableTop
      );

      doc.text(
        'Qty',
        colQty,
        tableTop
      );

      doc.text(
        'Unit Price',
        colPrice,
        tableTop
      );

      doc.text(
        'Amount',
        colAmount,
        tableTop
      );

      // ------------------------------------------------------
      // HEADER LINE
      // ------------------------------------------------------

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(
          545,
          tableTop + 15
        )
        .stroke();

      let currentY =
        tableTop + 25;

      // ======================================================
      // TABLE ITEMS
      // ======================================================

      doc.font('Helvetica');

      for (
        const item of items.rows
      ) {
        const quantity =
          Number(
            item.quantity
          );

        const unitPrice =
          Number(
            item.unit_price_snapshot
          );

        const amount =
          quantity *
          unitPrice;

        doc.text(
          item.product_name_snapshot ||
            '-',
          colProduct,
          currentY,
          {
            width: 190,
          }
        );

        doc.text(
          item.sku_snapshot ||
            '-',
          colSku,
          currentY,
          {
            width: 80,
          }
        );

        doc.text(
          String(quantity),
          colQty,
          currentY
        );

        doc.text(
          `₹${unitPrice.toFixed(
            2
          )}`,
          colPrice,
          currentY
        );

        doc.text(
          `₹${amount.toFixed(
            2
          )}`,
          colAmount,
          currentY
        );

        currentY += 25;
      }

      // ======================================================
      // TOTAL LINE
      // ======================================================

      doc
        .moveTo(
          50,
          currentY
        )
        .lineTo(
          545,
          currentY
        )
        .stroke();

      currentY += 15;

      doc
        .font('Helvetica-Bold')
        .fontSize(10);

      doc.text(
        `Total Quantity: ${totalQuantity}`,
        50,
        currentY
      );

      doc.text(
        `Grand Total: ₹${grandTotal.toFixed(
          2
        )}`,
        390,
        currentY
      );

      // ======================================================
      // FOOTER
      // ======================================================

      currentY += 60;

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          'Thank you for your business.',
          50,
          currentY,
          {
            align: 'center',
            width: 495,
          }
        );

      currentY += 20;

      doc
        .fontSize(8)
        .text(
          `Created by: ${
            data.created_by_name ||
            '-'
          }`,
          50,
          currentY,
          {
            align: 'center',
            width: 495,
          }
        );

      // ------------------------------------------------------
      // FINISH PDF
      // ------------------------------------------------------

      doc.end();
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// EXPORT ROUTER
// ============================================================

export default r;
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '../lib/api';

import type {
  Customer,
  Product,
} from '../types';

type ChallanItem = {
  product_id: string;
  name: string;
  quantity: number;
  stock: number;
};

export default function Challans() {
  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [rows, setRows] =
    useState<any[]>([]);

  const [customer, setCustomer] =
    useState('');

  const [productId, setProductId] =
    useState('');

  const [quantity, setQuantity] =
    useState(1);

  const [items, setItems] =
    useState<ChallanItem[]>([]);

  const [status, setStatus] =
    useState('Draft');

  const [loading, setLoading] =
    useState(false);

  const [pdfLoading, setPdfLoading] =
    useState<string | null>(null);

  // ============================================================
  // LOAD DATA
  // ============================================================

  async function load() {
    try {
      const [
        customerResponse,
        productResponse,
        challanResponse,
      ] = await Promise.all([
        api.get('/customers?limit=50'),
        api.get('/products'),
        api.get('/challans'),
      ]);

      setCustomers(
        customerResponse.data.data || []
      );

      setProducts(
        productResponse.data || []
      );

      setRows(
        challanResponse.data || []
      );
    } catch (error: any) {
      window.alert(
        error.response?.data?.message ||
          'Unable to load challan data'
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ============================================================
  // ADD ITEM
  // ============================================================

  function addItem() {
    const product =
      products.find(
        (item) =>
          item.id === productId
      );

    if (!product) {
      window.alert(
        'Please select a product.'
      );

      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      window.alert(
        'Quantity must be greater than zero.'
      );

      return;
    }

    const existingItem =
      items.find(
        (item) =>
          item.product_id ===
          product.id
      );

    if (existingItem) {
      window.alert(
        'This product is already added. Remove it before adding again.'
      );

      return;
    }

    if (
      status === 'Confirmed' &&
      quantity >
        product.current_stock
    ) {
      window.alert(
        `Insufficient stock. Available stock: ${product.current_stock}`
      );

      return;
    }

    setItems([
      ...items,
      {
        product_id: product.id,
        name: product.name,
        quantity,
        stock:
          product.current_stock,
      },
    ]);

    setProductId('');

    setQuantity(1);
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================

  function removeItem(
    index: number
  ) {
    setItems(
      items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  // ============================================================
  // SAVE CHALLAN
  // ============================================================

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!customer) {
      window.alert(
        'Please select a customer.'
      );

      return;
    }

    if (items.length === 0) {
      window.alert(
        'Please add at least one product.'
      );

      return;
    }

    setLoading(true);

    try {
      await api.post(
        '/challans',
        {
          customer_id:
            customer,

          items: items.map(
            (item) => ({
              product_id:
                item.product_id,

              quantity:
                item.quantity,
            })
          ),

          status,
        }
      );

      window.alert(
        'Challan created successfully.'
      );

      setItems([]);

      setCustomer('');

      setStatus('Draft');

      await load();
    } catch (error: any) {
      window.alert(
        error.response?.data?.message ||
          'Unable to create challan'
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // DOWNLOAD INVOICE PDF
  // ============================================================

  async function downloadInvoice(
    challanId: string,
    challanNumber: string
  ) {
    try {
      setPdfLoading(challanId);

      const response =
        await api.get(
          `/challans/${challanId}/invoice/pdf`,
          {
            responseType: 'blob',
          }
        );

      const blob =
        new Blob(
          [response.data],
          {
            type: 'application/pdf',
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href = url;

      const invoiceNumber =
        challanNumber.replace(
          /^CHL-/,
          'INV-'
        );

      link.download =
        `${invoiceNumber}.pdf`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error: any) {
      let message =
        'Unable to download invoice PDF.';

      // When backend returns an error
      // with responseType blob, the error
      // message is also inside a Blob.
      if (
        error.response?.data instanceof
        Blob
      ) {
        try {
          const text =
            await error.response.data.text();

          const data =
            JSON.parse(text);

          if (data.message) {
            message =
              data.message;
          }
        } catch {
          // Keep default message
        }
      } else if (
        error.response?.data?.message
      ) {
        message =
          error.response.data.message;
      }

      window.alert(message);
    } finally {
      setPdfLoading(null);
    }
  }

  // ============================================================
  // PERMISSION
  // ============================================================

  const canCreateChallan =
    ['Admin', 'Sales'].includes(
      user.role
    );

  // ============================================================
  // UI
  // ============================================================

  return (
    <section>
      <h1>Sales Challans</h1>

      {/* ======================================================
          CREATE CHALLAN
      ======================================================= */}

      {canCreateChallan && (
        <div className="panel">
          <h3>Create Challan</h3>

          <form onSubmit={save}>
            <label>
              Customer
            </label>

            <select
              value={customer}
              onChange={(event) =>
                setCustomer(
                  event.target.value
                )
              }
            >
              <option value="">
                Select customer
              </option>

              {customers.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                    {' — '}
                    {item.business_name ||
                      item.mobile}
                  </option>
                )
              )}
            </select>

            <br />
            <br />

            {/* ==================================================
                PRODUCT SELECTION
            =================================================== */}

            <div className="row">
              <select
                value={productId}
                onChange={(event) =>
                  setProductId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select product
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                      {' ('}
                      {
                        product.current_stock
                      }
                      {' stock)'}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Number(
                      event.target.value
                    )
                  )
                }
              />

              <button
                type="button"
                onClick={addItem}
              >
                Add Item
              </button>
            </div>

            <br />

            {/* ==================================================
                SELECTED PRODUCTS
            =================================================== */}

            {items.length > 0 && (
              <div>
                <h4>
                  Selected Products
                </h4>

                <ul>
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <li
                        key={
                          item.product_id
                        }
                      >
                        {item.name}
                        {' × '}
                        {item.quantity}

                        {' '}

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              index
                            )
                          }
                        >
                          Remove
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            <br />

            {/* ==================================================
                STATUS
            =================================================== */}

            <label>
              Challan Status
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
            >
              <option value="Draft">
                Draft
              </option>

              <option value="Confirmed">
                Confirmed
              </option>
            </select>

            <br />
            <br />

            <button
              type="submit"
              disabled={
                loading ||
                !customer ||
                items.length === 0
              }
            >
              {loading
                ? 'Saving...'
                : 'Save Challan'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          CHALLAN LIST
      ========================================================= */}

      <div className="panel">
        <h3>Challan List</h3>

        <table>
          <thead>
            <tr>
              <th>
                Number
              </th>

              <th>
                Customer
              </th>

              <th>
                Total Quantity
              </th>

              <th>
                Status
              </th>

              <th>
                Created
              </th>

              <th>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (challan) => (
                <tr
                  key={
                    challan.id
                  }
                >
                  <td>
                    {
                      challan.challan_number
                    }
                  </td>

                  <td>
                    {
                      challan.customer_name
                    }
                  </td>

                  <td>
                    {
                      challan.total_quantity
                    }
                  </td>

                  <td>
                    {
                      challan.status
                    }
                  </td>

                  <td>
                    {challan.created_at
                      ? new Date(
                          challan.created_at
                        ).toLocaleString()
                      : '-'}
                  </td>

                  {/* ==========================================
                      PDF BUTTON
                  =========================================== */}

                  <td>
                    {challan.status ===
                      'Confirmed' && (
                      <button
                        type="button"
                        disabled={
                          pdfLoading ===
                          challan.id
                        }
                        onClick={() =>
                          downloadInvoice(
                            challan.id,
                            challan.challan_number
                          )
                        }
                      >
                        {pdfLoading ===
                        challan.id
                          ? 'Generating...'
                          : 'Invoice PDF'}
                      </button>
                    )}

                    {challan.status ===
                      'Draft' && (
                      <span>
                        -
                      </span>
                    )}
                  </td>
                </tr>
              )
            )}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                >
                  No challans found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
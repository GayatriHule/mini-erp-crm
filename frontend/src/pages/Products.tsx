import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { Product } from '../types';

export default function Products() {
  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [rows, setRows] = useState<Product[]>([]);

  const [form, setForm] = useState<any>({
    name: '',
    sku: '',
    category: '',
    unit_price: 0,
    current_stock: 0,
    min_stock_alert: 0,
    warehouse_location: '',
  });

  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const response = await api.get('/products');

      setRows(response.data || []);
    } catch (error: any) {
      setMsg(
        error.response?.data?.message ||
          'Unable to load products'
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleChange(
    key: string,
    value: string
  ) {
    setForm((current: any) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMsg('');

    try {
      await api.post('/products', {
        ...form,
        unit_price: Number(form.unit_price),
        current_stock: Number(form.current_stock),
        min_stock_alert: Number(
          form.min_stock_alert
        ),
      });

      setForm({
        name: '',
        sku: '',
        category: '',
        unit_price: 0,
        current_stock: 0,
        min_stock_alert: 0,
        warehouse_location: '',
      });

      setMsg('Product added successfully.');

      await load();
    } catch (error: any) {
      setMsg(
        error.response?.data?.message ||
          'Unable to add product'
      );
    }
  }

  async function move(
    id: string,
    type: 'IN' | 'OUT'
  ) {
    const quantity = window.prompt(
      `Enter quantity for ${type}`
    );

    if (!quantity) {
      return;
    }

    const quantityNumber = Number(quantity);

    if (
      !Number.isFinite(quantityNumber) ||
      quantityNumber <= 0
    ) {
      window.alert(
        'Please enter a valid positive quantity.'
      );
      return;
    }

    const reason =
      window.prompt('Enter reason') ||
      'Manual stock movement';

    try {
      await api.post(
        `/products/${id}/movements`,
        {
          quantity: quantityNumber,
          movement_type: type,
          reason,
        }
      );

      window.alert(
        `Stock ${type} movement completed successfully.`
      );

      await load();
    } catch (error: any) {
      window.alert(
        error.response?.data?.message ||
          'Unable to update stock'
      );
    }
  }

  const canManageProducts =
    ['Admin', 'Warehouse'].includes(user.role);

  return (
    <section>
      <h1>Products & Inventory</h1>

      {canManageProducts && (
        <div className="panel">
          <h3>Add Product</h3>

          <form
            className="grid"
            onSubmit={save}
          >
            <input
              placeholder="Product name"
              value={form.name}
              onChange={(event) =>
                handleChange(
                  'name',
                  event.target.value
                )
              }
              required
            />

            <input
              placeholder="SKU / Code"
              value={form.sku}
              onChange={(event) =>
                handleChange(
                  'sku',
                  event.target.value
                )
              }
              required
            />

            <input
              placeholder="Category"
              value={form.category}
              onChange={(event) =>
                handleChange(
                  'category',
                  event.target.value
                )
              }
              required
            />

            <input
              placeholder="Unit price"
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(event) =>
                handleChange(
                  'unit_price',
                  event.target.value
                )
              }
            />

            <input
              placeholder="Current stock"
              type="number"
              min="0"
              value={form.current_stock}
              onChange={(event) =>
                handleChange(
                  'current_stock',
                  event.target.value
                )
              }
            />

            <input
              placeholder="Minimum stock alert"
              type="number"
              min="0"
              value={form.min_stock_alert}
              onChange={(event) =>
                handleChange(
                  'min_stock_alert',
                  event.target.value
                )
              }
            />

            <input
              placeholder="Warehouse location"
              value={form.warehouse_location}
              onChange={(event) =>
                handleChange(
                  'warehouse_location',
                  event.target.value
                )
              }
            />

            <button type="submit">
              Add Product
            </button>
          </form>

          {msg && <p>{msg}</p>}
        </div>
      )}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Minimum</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>

                <td>{product.sku}</td>

                <td>{product.category}</td>

                <td>
                  ₹
                  {Number(
                    product.unit_price
                  ).toFixed(2)}
                </td>

                <td
                  className={
                    product.current_stock <=
                    product.min_stock_alert
                      ? 'low'
                      : ''
                  }
                >
                  {product.current_stock}
                </td>

                <td>
                  {product.min_stock_alert}
                </td>

                <td>
                  {canManageProducts && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          move(
                            product.id,
                            'IN'
                          )
                        }
                      >
                        IN
                      </button>

                      {' '}

                      <button
                        type="button"
                        onClick={() =>
                          move(
                            product.id,
                            'OUT'
                          )
                        }
                      >
                        OUT
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
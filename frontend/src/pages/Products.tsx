import {
  useEffect,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import { api } from '../lib/api';

import type { Product } from '../types';

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  warehouse_location: string;
};

const emptyProduct: ProductForm = {
  name: '',
  sku: '',
  category: '',
  unit_price: 0,
  current_stock: 0,
  min_stock_alert: 0,
  warehouse_location: '',
};

export default function Products() {
  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [rows, setRows] =
    useState<Product[]>([]);

  const [form, setForm] =
    useState<ProductForm>(emptyProduct);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  async function loadProducts() {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/products',
        {
          params: {
            search,
          },
        }
      );

      setRows(response.data || []);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Unable to load products'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  function changeField(
    field: keyof ProductForm,
    value: string | number
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyProduct);
    setEditingProduct(null);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);

    setForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      unit_price: Number(
        product.unit_price || 0
      ),
      current_stock: Number(
        product.current_stock || 0
      ),
      min_stock_alert: Number(
        product.min_stock_alert || 0
      ),
      warehouse_location:
        product.warehouse_location || '',
    });

    setMessage('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function saveProduct(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!form.sku.trim()) {
      setError('SKU is required.');
      return;
    }

    if (!form.category.trim()) {
      setError('Category is required.');
      return;
    }

    if (form.unit_price < 0) {
      setError(
        'Unit price cannot be negative.'
      );
      return;
    }

    if (form.current_stock < 0) {
      setError(
        'Current stock cannot be negative.'
      );
      return;
    }

    if (form.min_stock_alert < 0) {
      setError(
        'Minimum stock alert cannot be negative.'
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        unit_price: Number(form.unit_price),
        current_stock: Number(
          form.current_stock
        ),
        min_stock_alert: Number(
          form.min_stock_alert
        ),
        warehouse_location:
          form.warehouse_location.trim(),
      };

      if (editingProduct) {
        await api.put(
          `/products/${editingProduct.id}`,
          payload
        );

        setMessage(
          'Product updated successfully.'
        );
      } else {
        await api.post(
          '/products',
          payload
        );

        setMessage(
          'Product added successfully.'
        );
      }

      resetForm();

      await loadProducts();
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Unable to save product'
      );
    } finally {
      setSaving(false);
    }
  }

  async function move(
    id: string,
    type: 'IN' | 'OUT'
  ) {
    const quantityText = window.prompt(
      `Enter quantity for stock ${type}:`
    );

    if (!quantityText) {
      return;
    }

    const quantity =
      Number(quantityText);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      window.alert(
        'Quantity must be a positive whole number.'
      );
      return;
    }

    const reason =
      window.prompt(
        `Reason for stock ${type}:`
      ) ||
      'Manual stock movement';

    try {
      await api.post(
        `/products/${id}/movements`,
        {
          quantity,
          movement_type: type,
          reason,
        }
      );

      window.alert(
        `Stock ${type} movement recorded successfully.`
      );

      await loadProducts();
    } catch (error: any) {
      window.alert(
        error.response?.data?.message ||
          'Unable to record stock movement'
      );
    }
  }

  const canManageProducts = [
    'Admin',
    'Warehouse',
  ].includes(user.role);

  return (
    <section>
      <h1>Products & Inventory</h1>

      {message && (
        <div className="panel">
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="panel">
          <p className="error">{error}</p>
        </div>
      )}

      {canManageProducts && (
        <div className="panel">
          <h3>
            {editingProduct
              ? 'Edit Product'
              : 'Add Product'}
          </h3>

          <form
            className="grid"
            onSubmit={saveProduct}
          >
            <label>
              Product Name *
              <input
                type="text"
                placeholder="Product name"
                value={form.name}
                onChange={(event) =>
                  changeField(
                    'name',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              SKU / Code *
              <input
                type="text"
                placeholder="SKU"
                value={form.sku}
                onChange={(event) =>
                  changeField(
                    'sku',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Category *
              <input
                type="text"
                placeholder="Category"
                value={form.category}
                onChange={(event) =>
                  changeField(
                    'category',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Unit Price
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit price"
                value={form.unit_price}
                onChange={(event) =>
                  changeField(
                    'unit_price',
                    Number(
                      event.target.value
                    )
                  )
                }
              />
            </label>

            <label>
              Current Stock
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Current stock"
                value={form.current_stock}
                onChange={(event) =>
                  changeField(
                    'current_stock',
                    Number(
                      event.target.value
                    )
                  )
                }
              />
            </label>

            <label>
              Minimum Stock Alert
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Minimum stock alert"
                value={form.min_stock_alert}
                onChange={(event) =>
                  changeField(
                    'min_stock_alert',
                    Number(
                      event.target.value
                    )
                  )
                }
              />
            </label>

            <label>
              Warehouse / Location
              <input
                type="text"
                placeholder="Warehouse location"
                value={
                  form.warehouse_location
                }
                onChange={(event) =>
                  changeField(
                    'warehouse_location',
                    event.target.value
                  )
                }
              />
            </label>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'end',
              }}
            >
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                    ? 'Update Product'
                    : 'Add Product'}
              </button>

              {editingProduct && (
                <button
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h3>Product Inventory</h3>

        <input
          type="text"
          placeholder="Search product, SKU or category..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          style={{
            width: '100%',
            marginBottom: '15px',
          }}
        />

        {loading ? (
          <p>Loading products...</p>
        ) : rows.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Min Alert</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((product) => {
                const lowStock =
                  Number(
                    product.current_stock
                  ) <=
                  Number(
                    product.min_stock_alert
                  );

                return (
                  <tr key={product.id}>
                    <td>
                      {product.name}
                    </td>

                    <td>
                      {product.sku}
                    </td>

                    <td>
                      {product.category}
                    </td>

                    <td>
                      ₹
                      {Number(
                        product.unit_price
                      ).toFixed(2)}
                    </td>

                    <td
                      className={
                        lowStock
                          ? 'low'
                          : ''
                      }
                    >
                      {product.current_stock}

                      {lowStock && (
                        <span>
                          {' '}
                          ⚠️
                        </span>
                      )}
                    </td>

                    <td>
                      {
                        product.min_stock_alert
                      }
                    </td>

                    <td>
                      {product.warehouse_location ||
                        '-'}
                    </td>

                    <td>
                      {canManageProducts && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap:
                              'wrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                product
                              )
                            }
                          >
                            Edit
                          </button>

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
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

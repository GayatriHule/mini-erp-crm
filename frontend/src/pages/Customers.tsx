import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Customer } from '../types';

type CustomerForm = {
  name: string;
  mobile: string;
  email: string;
  business_name: string;
  gst_number: string;
  customer_type: 'Retail' | 'Wholesale' | 'Distributor';
  address: string;
  status: 'Lead' | 'Active' | 'Inactive';
  follow_up_date: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: '',
  mobile: '',
  email: '',
  business_name: '',
  gst_number: '',
  customer_type: 'Retail',
  address: '',
  status: 'Lead',
  follow_up_date: '',
  notes: '',
};

export default function Customers() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [rows, setRows] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadCustomers() {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/customers', {
        params: {
          search,
          page: 1,
          limit: 50,
        },
      });

      setRows(response.data.data || []);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Unable to load customers'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  function changeField(
    field: keyof CustomerForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingCustomer(null);
  }

  function startEdit(customer: Customer) {
    setEditingCustomer(customer);

    setForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      business_name: customer.business_name || '',
      gst_number: customer.gst_number || '',
      customer_type:
        (customer.customer_type as CustomerForm['customer_type']) ||
        'Retail',
      address: customer.address || '',
      status:
        (customer.status as CustomerForm['status']) ||
        'Lead',
      follow_up_date: customer.follow_up_date
        ? String(customer.follow_up_date).substring(0, 10)
        : '',
      notes: customer.notes || '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function saveCustomer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!form.name.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (!form.mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        business_name: form.business_name.trim(),
        gst_number: form.gst_number.trim(),
        customer_type: form.customer_type,
        address: form.address.trim(),
        status: form.status,
        follow_up_date:
          form.follow_up_date || undefined,
        notes: form.notes.trim(),
      };

      if (editingCustomer) {
        await api.put(
          `/customers/${editingCustomer.id}`,
          payload
        );

        setMessage(
          'Customer updated successfully.'
        );
      } else {
        await api.post('/customers', payload);

        setMessage(
          'Customer added successfully.'
        );
      }

      resetForm();
      await loadCustomers();
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Unable to save customer'
      );
    } finally {
      setSaving(false);
    }
  }

  function viewCustomer(id: string) {
    navigate(`/customers/${id}`);
  }

  const canManageCustomers = [
    'Admin',
    'Sales',
  ].includes(user.role);

  return (
    <section>
      <h1>Customer CRM</h1>

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

      {canManageCustomers && (
        <div className="panel">
          <h3>
            {editingCustomer
              ? 'Edit Customer'
              : 'Add Customer'}
          </h3>

          <form
            className="grid"
            onSubmit={saveCustomer}
          >
            <label>
              Customer Name *
              <input
                type="text"
                placeholder="Customer name"
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
              Mobile Number *
              <input
                type="text"
                placeholder="Mobile number"
                value={form.mobile}
                onChange={(event) =>
                  changeField(
                    'mobile',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Email
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) =>
                  changeField(
                    'email',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Business Name
              <input
                type="text"
                placeholder="Business name"
                value={form.business_name}
                onChange={(event) =>
                  changeField(
                    'business_name',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              GST Number
              <input
                type="text"
                placeholder="GST number"
                value={form.gst_number}
                onChange={(event) =>
                  changeField(
                    'gst_number',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Customer Type
              <select
                value={form.customer_type}
                onChange={(event) =>
                  changeField(
                    'customer_type',
                    event.target.value
                  )
                }
              >
                <option value="Retail">
                  Retail
                </option>

                <option value="Wholesale">
                  Wholesale
                </option>

                <option value="Distributor">
                  Distributor
                </option>
              </select>
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  changeField(
                    'status',
                    event.target.value
                  )
                }
              >
                <option value="Lead">
                  Lead
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>
            </label>

            <label>
              Follow-up Date
              <input
                type="date"
                value={form.follow_up_date}
                onChange={(event) =>
                  changeField(
                    'follow_up_date',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Address
              <input
                type="text"
                placeholder="Address"
                value={form.address}
                onChange={(event) =>
                  changeField(
                    'address',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Notes
              <input
                type="text"
                placeholder="Notes"
                value={form.notes}
                onChange={(event) =>
                  changeField(
                    'notes',
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
                  : editingCustomer
                    ? 'Update Customer'
                    : 'Add Customer'}
              </button>

              {editingCustomer && (
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
        <h3>Customer List</h3>

        <input
          type="text"
          placeholder="Search name, mobile or business..."
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
          <p>Loading customers...</p>
        ) : rows.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>

                  <td>
                    {customer.business_name || '-'}
                  </td>

                  <td>{customer.mobile}</td>

                  <td>
                    {customer.customer_type}
                  </td>

                  <td>{customer.status}</td>

                  <td>
                    {customer.follow_up_date
                      ? String(
                          customer.follow_up_date
                        ).substring(0, 10)
                      : '-'}
                  </td>

                  <td>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          viewCustomer(customer.id)
                        }
                      >
                        View
                      </button>

                      {canManageCustomers && (
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(customer)
                          }
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

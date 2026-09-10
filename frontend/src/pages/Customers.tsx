import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { Customer } from '../types';

const emptyCustomer = {
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
  const [rows, setRows] = useState<Customer[]>([]);
  const [form, setForm] = useState<any>(emptyCustomer);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const response = await api.get('/customers', {
        params: {
          search,
        },
      });

      setRows(response.data.data || []);
    } catch (error: any) {
      setMsg(
        error.response?.data?.message ||
          'Unable to load customers'
      );
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  function handleChange(key: string, value: string) {
    setForm((current: any) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg('');

    try {
      await api.post('/customers', form);

      setForm({
        ...emptyCustomer,
      });

      setMsg('Customer added successfully.');

      await load();
    } catch (error: any) {
      setMsg(
        error.response?.data?.message ||
          'Unable to add customer'
      );
    }
  }

  return (
    <section>
      <h1>Customers</h1>

      <div className="panel">
        <h3>Add Customer</h3>

        <form className="grid" onSubmit={save}>
          <input
            placeholder="Customer name"
            value={form.name}
            onChange={(event) =>
              handleChange('name', event.target.value)
            }
            required
          />

          <input
            placeholder="Mobile number"
            value={form.mobile}
            onChange={(event) =>
              handleChange('mobile', event.target.value)
            }
            required
          />

          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(event) =>
              handleChange('email', event.target.value)
            }
          />

          <input
            placeholder="Business name"
            value={form.business_name}
            onChange={(event) =>
              handleChange('business_name', event.target.value)
            }
          />

          <input
            placeholder="GST number"
            value={form.gst_number}
            onChange={(event) =>
              handleChange('gst_number', event.target.value)
            }
          />

          <select
            value={form.customer_type}
            onChange={(event) =>
              handleChange(
                'customer_type',
                event.target.value
              )
            }
          >
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Distributor">Distributor</option>
          </select>

          <input
            placeholder="Address"
            value={form.address}
            onChange={(event) =>
              handleChange('address', event.target.value)
            }
          />

          <select
            value={form.status}
            onChange={(event) =>
              handleChange('status', event.target.value)
            }
          >
            <option value="Lead">Lead</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <input
            type="date"
            value={form.follow_up_date}
            onChange={(event) =>
              handleChange(
                'follow_up_date',
                event.target.value
              )
            }
          />

          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(event) =>
              handleChange('notes', event.target.value)
            }
          />

          <button type="submit">
            Add Customer
          </button>
        </form>

        {msg && <p>{msg}</p>}
      </div>

      <div className="panel">
        <input
          placeholder="Search name, mobile or business"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Business</th>
              <th>Mobile</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up</th>
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
                <td>{customer.customer_type}</td>
                <td>{customer.status}</td>
                <td>
                  {customer.follow_up_date || '-'}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
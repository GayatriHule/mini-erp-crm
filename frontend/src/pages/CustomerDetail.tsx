import {
  useEffect,
  useState,
} from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../lib/api';

type FollowUp = {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date?: string;
  created_by?: string;
  created_at?: string;
};

type CustomerDetailData = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  business_name?: string;
  gst_number?: string;
  customer_type: string;
  address?: string;
  status: string;
  follow_up_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  followups?: FollowUp[];
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [customer, setCustomer] =
    useState<CustomerDetailData | null>(null);

  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  async function loadCustomer() {
    if (!id) {
      setError('Customer ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        `/customers/${id}`
      );

      setCustomer(response.data);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Unable to load customer details'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
  }, [id]);

  async function addFollowUp(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!id) {
      return;
    }

    if (!note.trim()) {
      setError(
        'Please enter a follow-up note.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.post(
        `/customers/${id}/followups`,
        {
          note: note.trim(),
          follow_up_date:
            followUpDate || undefined,
        }
      );

      setNote('');
      setFollowUpDate('');

      setMessage(
        'Follow-up added successfully.'
      );

      await loadCustomer();
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Unable to add follow-up'
      );
    } finally {
      setSaving(false);
    }
  }

  const canEdit = [
    'Admin',
    'Sales',
  ].includes(user.role);

  if (loading) {
    return (
      <section>
        <p>Loading customer details...</p>
      </section>
    );
  }

  if (error && !customer) {
    return (
      <section>
        <div className="panel">
          <p className="error">{error}</p>

          <button
            onClick={() =>
              navigate('/customers')
            }
          >
            Back to Customers
          </button>
        </div>
      </section>
    );
  }

  if (!customer) {
    return (
      <section>
        <div className="panel">
          <p>Customer not found.</p>

          <button
            onClick={() =>
              navigate('/customers')
            }
          >
            Back to Customers
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1>Customer Details</h1>
          <p>
            Complete CRM information and follow-up
            history.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={() =>
              navigate('/customers')
            }
          >
            Back
          </button>

          {canEdit && (
            <button
              onClick={() =>
                navigate('/customers')
              }
            >
              Edit Customer
            </button>
          )}
        </div>
      </div>

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

      <div className="panel">
        <h3>Basic Information</h3>

        <div className="grid">
          <div>
            <strong>Customer Name</strong>
            <p>{customer.name}</p>
          </div>

          <div>
            <strong>Mobile Number</strong>
            <p>{customer.mobile}</p>
          </div>

          <div>
            <strong>Email</strong>
            <p>{customer.email || '-'}</p>
          </div>

          <div>
            <strong>Business Name</strong>
            <p>
              {customer.business_name || '-'}
            </p>
          </div>

          <div>
            <strong>GST Number</strong>
            <p>
              {customer.gst_number || '-'}
            </p>
          </div>

          <div>
            <strong>Customer Type</strong>
            <p>{customer.customer_type}</p>
          </div>

          <div>
            <strong>Status</strong>
            <p>{customer.status}</p>
          </div>

          <div>
            <strong>Follow-up Date</strong>
            <p>
              {customer.follow_up_date
                ? String(
                    customer.follow_up_date
                  ).substring(0, 10)
                : '-'}
            </p>
          </div>

          <div>
            <strong>Address</strong>
            <p>
              {customer.address || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Customer Notes</h3>

        <p>
          {customer.notes ||
            'No customer notes available.'}
        </p>
      </div>

      {canEdit && (
        <div className="panel">
          <h3>Add Follow-up</h3>

          <form
            className="grid"
            onSubmit={addFollowUp}
          >
            <label>
              Follow-up Note
              <input
                type="text"
                placeholder="Enter follow-up note"
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
              />
            </label>

            <label>
              Follow-up Date
              <input
                type="date"
                value={followUpDate}
                onChange={(event) =>
                  setFollowUpDate(
                    event.target.value
                  )
                }
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'end',
              }}
            >
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Add Follow-up'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h3>Follow-up History</h3>

        {!customer.followups ||
        customer.followups.length === 0 ? (
          <p>
            No follow-up history available.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Follow-up Date</th>
                <th>Note</th>
              </tr>
            </thead>

            <tbody>
              {customer.followups.map(
                (followup) => (
                  <tr key={followup.id}>
                    <td>
                      {followup.created_at
                        ? new Date(
                            followup.created_at
                          ).toLocaleString()
                        : '-'}
                    </td>

                    <td>
                      {followup.follow_up_date
                        ? String(
                            followup.follow_up_date
                          ).substring(0, 10)
                        : '-'}
                    </td>

                    <td>
                      {followup.note}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
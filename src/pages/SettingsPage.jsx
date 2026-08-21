import { useSelector } from 'react-redux'
import ChangePasswordForm from '../components/ChangePasswordForm'
import { selectUser } from '../store/authSlice'

/**
 * Home for anything account-scoped. Password only for now; the Preferences
 * card is the marked-out spot for the date-format setting (src/utils/periods.js
 * formats dates as `d MMM yyyy` for everyone today), so landing that later does
 * not mean restructuring this page.
 */
export default function SettingsPage() {
  const user = useSelector(selectUser)
  const email = (user && user.email) || ''

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="card-title">Account</h2>
        <p className="mt-2 text-sm text-slate-700">{email}</p>
        <p className="hint">
          The address you sign in with. It cannot be changed here yet.
        </p>
      </section>

      <ChangePasswordForm />

      <section className="card">
        <h2 className="card-title">Preferences</h2>
        <p className="mt-2 text-sm text-slate-500">
          Nothing to set yet. Date and number formatting will live here.
        </p>
      </section>
    </div>
  )
}

import { redirect } from 'next/navigation'

// This app is headless: the root simply forwards to the Payload admin.
export default function HomePage() {
  redirect('/admin')
}

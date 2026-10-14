type OnsiteWindow = Window & { payfast_do_onsite_payment?: (options: { uuid: string; return_url: string; cancel_url: string }) => void }
let loading: Promise<void> | null = null
let loadedEnvironment: boolean | null = null

export async function openPayfastOnsite(uuid: string, sandbox: boolean): Promise<void> {
  if (!/^[a-zA-Z0-9-]{6,100}$/.test(uuid)) throw new Error('Invalid PayFast checkout.')
  const target = window as OnsiteWindow
  if (loadedEnvironment !== null && loadedEnvironment !== sandbox) throw new Error('Payment environment changed. Reload this page.')
  if (!loading) {
    loadedEnvironment = sandbox
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = sandbox ? 'https://sandbox.payfast.co.za/onsite/engine.js' : 'https://www.payfast.co.za/onsite/engine.js'
      script.async = true
      const fail = () => { clearTimeout(timer); script.remove(); loading = null; loadedEnvironment = null; reject(new Error('Could not load PayFast. Check your connection and try again.')) }
      const timer = window.setTimeout(fail, 20000)
      script.onload = () => { if (!target.payfast_do_onsite_payment) { fail(); return }; clearTimeout(timer); resolve() }
      script.onerror = fail
      document.head.appendChild(script)
    })
  }
  await loading
  target.payfast_do_onsite_payment!({ uuid, return_url: `${window.location.origin}/#/payment/success`, cancel_url: `${window.location.origin}/#/payment/cancelled` })
}

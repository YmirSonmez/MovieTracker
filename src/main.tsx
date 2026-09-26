import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerServiceWorker } from './registerServiceWorker'
import { beginSignIn, consumeAuthRedirect, shouldRenewSilently } from './services/auth/google'
import { prepareDeviceForAccount } from './services/sync/engine'
import { useSyncStore } from './store/syncStore'
import './styles/globals.css'

registerServiceWorker()

async function boot(): Promise<void> {
  // Google's answer arrives in the URL fragment, which HashRouter would
  // otherwise take for a route - it has to be consumed before rendering.
  const result = await consumeAuthRedirect()

  if (result.kind === 'none' && shouldRenewSilently()) {
    // Linked device, expired token: bounce through Google for a new one
    // before anything is drawn - no screen, no click, back in a moment.
    beginSignIn({ silent: true })
    return
  }
  if (result.kind === 'signedIn') await prepareDeviceForAccount(result.email)
  if (result.kind === 'failed') useSyncStore.setState({ authFailure: { reason: result.reason, message: result.message, silent: result.silent } })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()

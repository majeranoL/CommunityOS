import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { loginMutate } = vi.hoisted(() => ({ loginMutate: vi.fn() }))

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useLogin: () => ({ mutate: loginMutate, isPending: false }),
  useRegister: () => ({ mutate: vi.fn(), isPending: false }),
  useForgotPassword: () => ({ mutate: vi.fn(), isPending: false }),
  useResetPassword: () => ({ mutate: vi.fn(), isPending: false }),
  useSession: () => ({ user: null, status: 'idle' }),
}))

import LoginPage from '@/features/auth/pages/login-page'

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  loginMutate.mockReset()
})

describe('LoginPage', () => {
  it('shows validation errors when the form is submitted empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(loginMutate).not.toHaveBeenCalled()
  })

  it('rejects an email that passes HTML5 checks but not the schema', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'a@b')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Str0ng!Pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(loginMutate).not.toHaveBeenCalled()
  })

  it('submits the credentials on a valid form', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Str0ng!Pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitForMutation()

    expect(loginMutate).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'Str0ng!Pass',
    })
  })
})

function waitForMutation() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

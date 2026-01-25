import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center items-center overflow-hidden bg-gradient-to-b from-[#F8F7FC] to-[#F0EEF8] p-4">
      {/* Background decorative elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-starbiz-dark/5 rounded-full blur-3xl" />
      </div>
      {children}
    </div>
  )
}

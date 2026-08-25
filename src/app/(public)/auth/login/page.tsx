import Link from 'next/link';
import LoginForm from "./form"
import Image from 'next/image';
import { Suspense } from 'react';

const logo = "https://res.cloudinary.com/dpfnxj52w/image/upload/v1759341727/icon-app-v1.0_ehhycl.png"

export default function LoginPage() {
  return (
    <div className="w-full space-y-4 mt-14">
      <div className="text-center">
        <Image src={logo} width={200} height={0} className="mx-auto" style={{ width: '200px', height: '182px' }} alt="Axi" />
        <div className="space-y-2">
          <h3 className="text-2xl font-bold sm:text-3xl">Inicia sesión en tu cuenta</h3>
          <p className="text-sm text-muted-foreground">¿No tienes cuenta? <Link href="/contacto" className="font-medium text-brand">Contáctanos</Link></p>
        </div>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
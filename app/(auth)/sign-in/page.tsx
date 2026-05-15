import SignInForm from "@/components/auth/sign-in-form";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}

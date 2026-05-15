import SignUpForm from "@/components/auth/sign-up-form";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}

import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import { ProfilePage } from "@/components/profile/profileKit";
import React from "react";

export default function ChangePassword() {
  return (
    <ProfilePage
      eyebrow="Settings"
      title="Change password"
      subtitle="The password you use to sign in with your email."
      fallback="/(owner)/Settings/CompanyProfile"
    >
      <ChangePasswordForm />
    </ProfilePage>
  );
}

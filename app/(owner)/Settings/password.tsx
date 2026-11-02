import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import { ProfilePage } from "@/components/profile/profileKit";
import React from "react";
import { tr } from "@/i18n";

export default function ChangePassword() {
  return (
    <ProfilePage
      eyebrow={tr("Settings")}
      title={tr("Change password")}
      subtitle={tr("The password you use to sign in with your email.")}
      fallback="/(owner)/Settings/CompanyProfile"
    >
      <ChangePasswordForm />
    </ProfilePage>
  );
}

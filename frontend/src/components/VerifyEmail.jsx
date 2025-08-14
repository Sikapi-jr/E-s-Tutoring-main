import { useParams } from "react-router-dom";
import { useEffect } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const { t } = useTranslation();
  const { uid, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .post("/api/verifyEmail/", { uid, token })
      .then((res) => {
        alert(t('auth.emailVerified'));
        navigate("/");
      })
      .catch((err) => {
        alert(t('auth.verificationFailed'));
      });
  }, [uid, token]);

  return <p>{t('auth.verifyingEmail')}</p>;
}
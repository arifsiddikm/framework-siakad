import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { toastSuccess } from "@/lib/alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, api, errorMessage } from "@/lib/api";

const schema = z
  .object({
    current_password: z.string().min(1, "Kata sandi saat ini wajib diisi."),
    new_password: z.string().min(10, "Kata sandi baru minimal 10 karakter."),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Konfirmasi tidak sama dengan kata sandi baru." });
type Values = z.infer<typeof schema>;

export default function SecurityPage() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ current_password, new_password }: Values) => {
    setError(null);
    try {
      await api.post("/auth/password/", { current_password, new_password });
      reset();
      toastSuccess("Kata sandi berhasil diganti.");
    } catch (e) {
      if (e instanceof ApiError && e.fields.current_password) setFieldError("current_password", { message: e.fields.current_password });
      else if (e instanceof ApiError && e.fields.password) setFieldError("new_password", { message: e.fields.password });
      else setError(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Keamanan akun" description="Ganti kata sandi Anda secara berkala." />
      <Card className="max-w-lg">
        <CardHeader title="Ganti kata sandi" />
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-4 sm:p-5">
          {error && <Note tone="error">{error}</Note>}
          <Input label="Kata sandi saat ini" type="password" autoComplete="current-password" error={errors.current_password?.message} {...register("current_password")} />
          <Input label="Kata sandi baru" type="password" autoComplete="new-password" hint="Minimal 10 karakter dan tidak terlalu umum." error={errors.new_password?.message} {...register("new_password")} />
          <Input label="Ulangi kata sandi baru" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
          <Button type="submit" loading={isSubmitting}>Simpan kata sandi</Button>
        </form>
      </Card>
    </>
  );
}

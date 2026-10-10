import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Zap } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Me } from "@/auth/AuthProvider";
import type { DevAccount } from "@/auth/devAccounts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { api, errorMessage } from "@/lib/api";

const schema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});
type Values = z.infer<typeof schema>;

type Props = {
  /** Called after the server accepted the credentials. Return a message to refuse the session. */
  onSignedIn: (me: Me) => Promise<string | null>;
  /** Dev shortcuts that fill the form (empty in production builds). */
  devAccounts?: DevAccount[];
  /** Dev only: start with this account already typed in. */
  prefill?: DevAccount;
  /** Shown under the password field, e.g. "Lupa kata sandi?". */
  belowPassword?: React.ReactNode;
  submitLabel?: string;
};

/** Username + password form shared by the portal login and the admin login. */
export function LoginForm({ onSignedIn, devAccounts = [], prefill, belowPassword, submitLabel = "Masuk" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: prefill ? { username: prefill.username, password: prefill.password } : undefined,
  });

  const submit = async (values: Values) => {
    setError(null);
    try {
      const me = await api.post<Me>("/auth/login/", values);
      const refusal = await onSignedIn(me);
      if (refusal) setError(refusal);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {error && <Note tone="error">{error}</Note>}
      <Input look="filled" label="Username" required autoComplete="username" autoFocus error={errors.username?.message} {...register("username")} />
      <div>
        <Input
          look="filled"
          label="Kata sandi"
          required
          type={show ? "text" : "password"}
          autoComplete="current-password"
          error={errors.password?.message}
          endAdornment={
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="grid size-10 place-items-center rounded-ctl text-slate-600 hover:bg-white/70"
            >
              {show ? <EyeOff className="size-[18px]" strokeWidth={1.75} /> : <Eye className="size-[18px]" strokeWidth={1.75} />}
            </button>
          }
          {...register("password")}
        />
        {belowPassword && <div className="mt-2 text-right text-[13px]">{belowPassword}</div>}
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        {submitLabel}
      </Button>

      {devAccounts.length > 0 && (
        <div className="rounded-card border border-dashed border-amber-500/60 bg-amber-50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-amber-800">
            <Zap className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Mode pengembangan · isi otomatis
          </p>
          <div className="flex flex-wrap gap-2">
            {devAccounts.map((account) => (
              <Button
                key={account.username}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setValue("username", account.username, { shouldValidate: true });
                  setValue("password", account.password, { shouldValidate: true });
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

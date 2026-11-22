export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="text-xs font-medium leading-5 text-[#b42318] dark:text-[#fda29b]">{message}</p> : null;
}

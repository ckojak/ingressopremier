/** Utilidades de CPF (validação por dígito verificador — módulo 11). */

export const onlyDigits = (value: string) => (value || "").replace(/\D/g, "");

export const formatCpf = (value: string) => {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};

export const isValidCpf = (raw: string): boolean => {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 || rest === 11 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
};

export const cpfError = (raw: string): string | null => {
  const cpf = onlyDigits(raw);
  if (cpf.length === 0) return "Informe o CPF";
  if (cpf.length < 11) return "CPF incompleto";
  if (!isValidCpf(cpf)) return "CPF inválido — confira os números digitados";
  return null;
};

export function nameValid(name: string): boolean {
  return name.trim().length >= 2;
}

export function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function phoneValid(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 7;
}

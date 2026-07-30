export function generateSecurePassword(length: number = 12): string {
  const charsetLowercase = "abcdefghijklmnopqrstuvwxyz";
  const charsetUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const charsetNumbers = "0123456789";
  const charsetSpecial = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let password = "";

  // Ensure at least one of each required character type
  password += charsetLowercase[crypto.getRandomValues(new Uint32Array(1))[0] % charsetLowercase.length];
  password += charsetUppercase[crypto.getRandomValues(new Uint32Array(1))[0] % charsetUppercase.length];
  password += charsetNumbers[crypto.getRandomValues(new Uint32Array(1))[0] % charsetNumbers.length];
  password += charsetSpecial[crypto.getRandomValues(new Uint32Array(1))[0] % charsetSpecial.length];

  const allCharsets = charsetLowercase + charsetUppercase + charsetNumbers + charsetSpecial;

  // Fill the rest of the password
  for (let i = 4; i < length; i++) {
    password += allCharsets[crypto.getRandomValues(new Uint32Array(1))[0] % allCharsets.length];
  }

  // Shuffle the resulting password array to remove predictability
  const passArray = password.split('');
  for (let i = passArray.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [passArray[i], passArray[j]] = [passArray[j], passArray[i]];
  }

  return passArray.join('');
}

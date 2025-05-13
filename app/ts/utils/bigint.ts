export const addressString = (address: bigint): `0x${ string }` => `0x${ address.toString(16).padStart(40, '0') }`

import '@testing-library/jest-dom/vitest';

// jsdom no implementa las URL de objetos que usan las miniaturas y las descargas.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:prueba';
  URL.revokeObjectURL = () => {};
}

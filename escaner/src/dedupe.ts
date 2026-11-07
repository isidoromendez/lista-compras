// Evita consultar el mismo código mientras sigue frente a la cámara.
// Un código vuelve a contar si desapareció de cuadro al menos `pausaMs`.
export function crearFiltroCodigos(pausaMs = 2500) {
  let ultimo: string | null = null;
  let vistoEn = 0;
  return (codigo: string, ahora = Date.now()): boolean => {
    const nuevo = codigo !== ultimo || ahora - vistoEn > pausaMs;
    ultimo = codigo;
    vistoEn = ahora;
    return nuevo;
  };
}

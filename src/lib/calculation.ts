import Decimal from "decimal.js";
import type { Coefficient } from "./model";
const rounded = (n: Decimal) => n.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
export function calculate(
  row: Coefficient,
  distance: number,
  returnDistance = 0,
) {
  if (
    !Number.isFinite(distance) ||
    distance < 1 ||
    distance > 99999 ||
    !Number.isFinite(returnDistance) ||
    returnDistance < 0 ||
    returnDistance > 99999
  )
    throw Error(
      "Informe distâncias de ida de 1 a 99.999 km e retorno de 0 a 99.999 km",
    );
  const outbound = new Decimal(row.ccd).mul(distance).add(row.cc);
  const returnValue = new Decimal(row.ccd).mul(returnDistance).mul("0.92");
  return {
    outbound: rounded(outbound).toNumber(),
    returnValue: rounded(returnValue).toNumber(),
    total: rounded(outbound.add(returnValue)).toNumber(),
  };
}

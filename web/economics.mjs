export function businessCase({
  volume,
  minutes,
  rate,
  realization,
  monthlyCost,
  setupCost,
}) {
  const inputs = [volume, minutes, rate, realization, monthlyCost, setupCost];
  if (inputs.some((x) => !Number.isFinite(x) || x < 0) || realization > 100)
    throw Error(
      "Use nonnegative inputs and a realization percentage from 0 to 100",
    );
  const hours = (volume * minutes) / 60,
    capacityValue = hours * rate,
    monthlyBenefit = (capacityValue * realization) / 100,
    monthlyNet = monthlyBenefit - monthlyCost,
    firstYearCost = 12 * monthlyCost + setupCost,
    firstYearBenefit = 12 * monthlyBenefit,
    net = firstYearBenefit - firstYearCost;
  return {
    hours,
    capacityValue,
    monthlyBenefit,
    monthlyNet,
    firstYearCost,
    firstYearBenefit,
    net,
    roi: firstYearCost > 0 ? net / firstYearCost : null,
    payback: monthlyNet > 0 ? setupCost / monthlyNet : null,
    breakEvenVolume:
      minutes * rate * realization > 0
        ? monthlyCost / (((minutes / 60) * rate * realization) / 100)
        : null,
  };
}

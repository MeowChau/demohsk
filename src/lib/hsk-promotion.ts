export function promotionMessage(result: { hskLevel: number; currentHskLevel: number | null; previousCurrentHskLevel: number | null }) {
  const current = result.currentHskLevel ?? 0;
  if (current > (result.previousCurrentHskLevel ?? 0))
    return `Cấp độ HSK hiện tại trong hồ sơ đã cập nhật lên HSK ${current}.`;
  return `Mức hiện tại vẫn là HSK ${current || result.hskLevel}. Muốn nâng mức, bạn cần đạt đề của cấp cao hơn; đạt lại đề HSK ${result.hskLevel} không tự tăng sang cấp tiếp theo.`;
}

export const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Bills: "📄",
  Entertainment: "🎬",
  Other: "📌",
};

// Pool of icons assigned to custom categories by index
const CUSTOM_ICONS = [
  "🏠", "💼", "🎓", "💊", "✈️", "🎵", "📱", "🏋️",
  "🐾", "🌿", "☕", "🎁", "🔧", "📚", "💇", "🏥",
  "🧾", "🎯", "🛒", "💡", "🚌", "🍕", "🎮", "👶",
  "💰", "🏦", "🧳", "🪴", "🧹", "🎨",
];

export function getCategoryIcon(category: string, customCategories: string[] = []): string {
  if (category in CATEGORY_ICONS) return CATEGORY_ICONS[category as Category];
  const idx = customCategories.indexOf(category);
  if (idx >= 0) return CUSTOM_ICONS[idx % CUSTOM_ICONS.length];
  return "📌";
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "bg-orange-100 text-orange-700",
  Transport: "bg-blue-100 text-blue-700",
  Shopping: "bg-pink-100 text-pink-700",
  Bills: "bg-yellow-100 text-yellow-700",
  Entertainment: "bg-purple-100 text-purple-700",
  Other: "bg-gray-100 text-gray-700",
};

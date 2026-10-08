export type CategoryId =
  | "vegetables"
  | "fruits"
  | "leafy-greens"
  | "herbs"
  | "exotic";

export interface Category {
  id: CategoryId;
  name: string;
  emoji: string;
  tagline: string;
  color: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  hindiName: string;
  category: CategoryId;
  price: number;
  mrp: number;
  unit: string;
  emoji: string;
  tint: string;
  rating: number;
  reviews: number;
  organic: boolean;
  stock: number;
  origin: string;
  description: string;
  nutrition: { calories: number; carbs: number; protein: number; fiber: number };
  tags: ("bestseller" | "deal" | "new" | "seasonal")[];
}

export const categories: Category[] = [
  { id: "vegetables", name: "Fresh Vegetables", emoji: "🥕", tagline: "Daily kitchen essentials", color: "#fff1e6" },
  { id: "fruits", name: "Seasonal Fruits", emoji: "🍎", tagline: "Sweet, juicy & ripe", color: "#ffe9ec" },
  { id: "leafy-greens", name: "Leafy Greens", emoji: "🥬", tagline: "Packed with iron", color: "#e8f8ec" },
  { id: "herbs", name: "Herbs & Aromatics", emoji: "🌿", tagline: "Flavour boosters", color: "#eef7e4" },
  { id: "exotic", name: "Exotic Picks", emoji: "🥑", tagline: "Gourmet & imported", color: "#f2ecff" },
];

export const products: Product[] = [
  { id: 1, slug: "tomato-desi", name: "Desi Tomato", hindiName: "Tamatar", category: "vegetables", price: 32, mrp: 40, unit: "1 kg", emoji: "🍅", tint: "#ffe4e1", rating: 4.6, reviews: 1284, organic: false, stock: 120, origin: "Nashik, Maharashtra", description: "Juicy, tangy country tomatoes picked at peak ripeness — perfect for curries, chutneys and salads.", nutrition: { calories: 18, carbs: 3.9, protein: 0.9, fiber: 1.2 }, tags: ["bestseller"] },
  { id: 2, slug: "onion-red", name: "Red Onion", hindiName: "Pyaaz", category: "vegetables", price: 38, mrp: 45, unit: "1 kg", emoji: "🧅", tint: "#f6e6f2", rating: 4.5, reviews: 2210, organic: false, stock: 200, origin: "Lasalgaon, Maharashtra", description: "Firm, pungent red onions with a long shelf life. The backbone of every Indian tadka.", nutrition: { calories: 40, carbs: 9.3, protein: 1.1, fiber: 1.7 }, tags: ["bestseller"] },
  { id: 3, slug: "potato", name: "Potato", hindiName: "Aloo", category: "vegetables", price: 28, mrp: 35, unit: "1 kg", emoji: "🥔", tint: "#f7eedf", rating: 4.7, reviews: 3120, organic: false, stock: 250, origin: "Agra, Uttar Pradesh", description: "All-purpose potatoes with a fluffy texture, ideal for aloo sabzi, fries and parathas.", nutrition: { calories: 77, carbs: 17, protein: 2, fiber: 2.2 }, tags: ["bestseller", "deal"] },
  { id: 4, slug: "carrot-orange", name: "Orange Carrot", hindiName: "Gajar", category: "vegetables", price: 46, mrp: 60, unit: "500 g", emoji: "🥕", tint: "#ffead6", rating: 4.4, reviews: 860, organic: true, stock: 80, origin: "Ooty, Tamil Nadu", description: "Crunchy, sweet carrots from the Nilgiri hills. Great for halwa, salads and juices.", nutrition: { calories: 41, carbs: 9.6, protein: 0.9, fiber: 2.8 }, tags: ["seasonal"] },
  { id: 5, slug: "cauliflower", name: "Cauliflower", hindiName: "Phool Gobhi", category: "vegetables", price: 35, mrp: 45, unit: "1 pc (~600 g)", emoji: "🥦", tint: "#eef6e4", rating: 4.3, reviews: 640, organic: false, stock: 60, origin: "Ludhiana, Punjab", description: "Tight, creamy-white florets. Roast it, curry it, or make the classic aloo gobhi.", nutrition: { calories: 25, carbs: 5, protein: 1.9, fiber: 2 }, tags: ["deal"] },
  { id: 6, slug: "brinjal-bharta", name: "Bharta Brinjal", hindiName: "Baingan", category: "vegetables", price: 42, mrp: 50, unit: "500 g", emoji: "🍆", tint: "#efe6fa", rating: 4.2, reviews: 412, organic: false, stock: 45, origin: "Kolar, Karnataka", description: "Large, glossy brinjals with few seeds — made for smoky baingan bharta.", nutrition: { calories: 25, carbs: 6, protein: 1, fiber: 3 }, tags: [] },
  { id: 7, slug: "capsicum-green", name: "Green Capsicum", hindiName: "Shimla Mirch", category: "vegetables", price: 30, mrp: 40, unit: "250 g", emoji: "🫑", tint: "#e6f6e2", rating: 4.4, reviews: 530, organic: false, stock: 70, origin: "Shimla, Himachal Pradesh", description: "Thick-walled bell peppers with a mild, fresh crunch. Stir-fries love them.", nutrition: { calories: 20, carbs: 4.6, protein: 0.9, fiber: 1.7 }, tags: [] },
  { id: 8, slug: "cucumber", name: "Cucumber", hindiName: "Kheera", category: "vegetables", price: 24, mrp: 30, unit: "500 g", emoji: "🥒", tint: "#e3f5e6", rating: 4.5, reviews: 720, organic: true, stock: 90, origin: "Pune, Maharashtra", description: "Cool and crisp cucumbers for raita, salads and summer coolers.", nutrition: { calories: 15, carbs: 3.6, protein: 0.7, fiber: 0.5 }, tags: ["deal"] },
  { id: 9, slug: "sweet-corn", name: "Sweet Corn", hindiName: "Bhutta", category: "vegetables", price: 40, mrp: 50, unit: "2 pcs", emoji: "🌽", tint: "#fff6d6", rating: 4.6, reviews: 980, organic: false, stock: 65, origin: "Chhindwara, Madhya Pradesh", description: "Plump golden kernels bursting with sweetness. Grill with nimbu-masala for the monsoon feel.", nutrition: { calories: 86, carbs: 19, protein: 3.3, fiber: 2.7 }, tags: ["seasonal", "bestseller"] },
  { id: 10, slug: "green-peas", name: "Green Peas", hindiName: "Matar", category: "vegetables", price: 60, mrp: 80, unit: "500 g", emoji: "🫛", tint: "#e7f7df", rating: 4.5, reviews: 455, organic: true, stock: 40, origin: "Jabalpur, Madhya Pradesh", description: "Sweet, tender winter peas in their pods. Matar paneer is calling.", nutrition: { calories: 81, carbs: 14, protein: 5.4, fiber: 5.1 }, tags: ["seasonal"] },
  { id: 11, slug: "garlic", name: "Garlic", hindiName: "Lehsun", category: "vegetables", price: 55, mrp: 70, unit: "250 g", emoji: "🧄", tint: "#f5f1ea", rating: 4.7, reviews: 1630, organic: false, stock: 150, origin: "Mandsaur, Madhya Pradesh", description: "Bold, aromatic garlic bulbs with large cloves that peel easily.", nutrition: { calories: 149, carbs: 33, protein: 6.4, fiber: 2.1 }, tags: ["bestseller"] },
  { id: 12, slug: "ginger", name: "Ginger", hindiName: "Adrak", category: "vegetables", price: 35, mrp: 45, unit: "250 g", emoji: "🫚", tint: "#f8ecd9", rating: 4.5, reviews: 1104, organic: true, stock: 110, origin: "Wayanad, Kerala", description: "Fibre-light, zesty ginger for chai, curries and immunity shots.", nutrition: { calories: 80, carbs: 18, protein: 1.8, fiber: 2 }, tags: [] },
  { id: 13, slug: "banana-robusta", name: "Robusta Banana", hindiName: "Kela", category: "fruits", price: 48, mrp: 60, unit: "1 dozen", emoji: "🍌", tint: "#fff7cf", rating: 4.6, reviews: 2045, organic: false, stock: 140, origin: "Jalgaon, Maharashtra", description: "Naturally ripened bananas — an instant energy boost, no carbide ever.", nutrition: { calories: 89, carbs: 23, protein: 1.1, fiber: 2.6 }, tags: ["bestseller"] },
  { id: 14, slug: "apple-shimla", name: "Shimla Apple", hindiName: "Seb", category: "fruits", price: 160, mrp: 199, unit: "1 kg", emoji: "🍎", tint: "#ffe3e3", rating: 4.5, reviews: 1320, organic: false, stock: 75, origin: "Kinnaur, Himachal Pradesh", description: "Crisp, sweet-tart Himalayan apples with a beautiful red blush.", nutrition: { calories: 52, carbs: 14, protein: 0.3, fiber: 2.4 }, tags: ["seasonal"] },
  { id: 15, slug: "mango-alphonso", name: "Alphonso Mango", hindiName: "Hapus Aam", category: "fruits", price: 699, mrp: 899, unit: "1 dozen", emoji: "🥭", tint: "#ffefcf", rating: 4.9, reviews: 3890, organic: true, stock: 30, origin: "Ratnagiri, Maharashtra", description: "The king of mangoes. GI-tagged Ratnagiri Hapus with saffron flesh and heady aroma.", nutrition: { calories: 60, carbs: 15, protein: 0.8, fiber: 1.6 }, tags: ["bestseller", "seasonal"] },
  { id: 16, slug: "grapes-green", name: "Green Grapes", hindiName: "Angoor", category: "fruits", price: 90, mrp: 120, unit: "500 g", emoji: "🍇", tint: "#ecf6dd", rating: 4.3, reviews: 610, organic: false, stock: 55, origin: "Sangli, Maharashtra", description: "Seedless, crunchy grapes chilled straight from the vineyards of Sangli.", nutrition: { calories: 69, carbs: 18, protein: 0.7, fiber: 0.9 }, tags: ["deal"] },
  { id: 17, slug: "watermelon", name: "Watermelon", hindiName: "Tarbooz", category: "fruits", price: 65, mrp: 80, unit: "1 pc (~2.5 kg)", emoji: "🍉", tint: "#ffe2e6", rating: 4.4, reviews: 870, organic: false, stock: 25, origin: "Anantapur, Andhra Pradesh", description: "Deep red, crunchy and hydrating. Summer in a single slice.", nutrition: { calories: 30, carbs: 7.6, protein: 0.6, fiber: 0.4 }, tags: ["seasonal"] },
  { id: 18, slug: "pomegranate", name: "Pomegranate", hindiName: "Anaar", category: "fruits", price: 140, mrp: 180, unit: "1 kg", emoji: "🔴", tint: "#ffe0e4", rating: 4.6, reviews: 990, organic: true, stock: 35, origin: "Solapur, Maharashtra", description: "Bhagwa pomegranates with ruby arils that are sweet, juicy and antioxidant-rich.", nutrition: { calories: 83, carbs: 19, protein: 1.7, fiber: 4 }, tags: ["new"] },
  { id: 19, slug: "orange-nagpur", name: "Nagpur Orange", hindiName: "Santra", category: "fruits", price: 85, mrp: 100, unit: "1 kg", emoji: "🍊", tint: "#ffead2", rating: 4.5, reviews: 780, organic: false, stock: 60, origin: "Nagpur, Maharashtra", description: "Loose-skinned, easy-to-peel oranges with a perfect sweet-sour balance.", nutrition: { calories: 47, carbs: 12, protein: 0.9, fiber: 2.4 }, tags: ["deal"] },
  { id: 20, slug: "papaya", name: "Papaya", hindiName: "Papita", category: "fruits", price: 55, mrp: 70, unit: "1 pc (~1 kg)", emoji: "🍈", tint: "#fff0d9", rating: 4.2, reviews: 340, organic: false, stock: 40, origin: "Anand, Gujarat", description: "Buttery-soft papaya, great for digestion and breakfast bowls.", nutrition: { calories: 43, carbs: 11, protein: 0.5, fiber: 1.7 }, tags: [] },
  { id: 21, slug: "spinach", name: "Spinach", hindiName: "Palak", category: "leafy-greens", price: 25, mrp: 30, unit: "250 g bunch", emoji: "🥬", tint: "#e2f5e2", rating: 4.5, reviews: 1430, organic: true, stock: 100, origin: "Nainital, Uttarakhand", description: "Tender, dark-green leaves washed and bundled — palak paneer ready.", nutrition: { calories: 23, carbs: 3.6, protein: 2.9, fiber: 2.2 }, tags: ["bestseller"] },
  { id: 22, slug: "fenugreek", name: "Fenugreek Leaves", hindiName: "Methi", category: "leafy-greens", price: 20, mrp: 25, unit: "200 g bunch", emoji: "🌱", tint: "#e6f7df", rating: 4.4, reviews: 520, organic: true, stock: 80, origin: "Jaipur, Rajasthan", description: "Slightly bitter, deeply aromatic methi for theplas, parathas and aloo methi.", nutrition: { calories: 49, carbs: 6, protein: 4.4, fiber: 1.1 }, tags: [] },
  { id: 23, slug: "mustard-greens", name: "Mustard Greens", hindiName: "Sarson Saag", category: "leafy-greens", price: 30, mrp: 40, unit: "500 g", emoji: "🥗", tint: "#e9f6d8", rating: 4.6, reviews: 390, organic: true, stock: 50, origin: "Amritsar, Punjab", description: "Peppery winter greens — slow-cook with makki di roti for the real Punjabi experience.", nutrition: { calories: 27, carbs: 4.7, protein: 2.9, fiber: 3.2 }, tags: ["seasonal"] },
  { id: 24, slug: "lettuce-iceberg", name: "Iceberg Lettuce", hindiName: "Salad Patta", category: "leafy-greens", price: 70, mrp: 90, unit: "1 pc", emoji: "🥬", tint: "#e5f6ea", rating: 4.1, reviews: 220, organic: false, stock: 30, origin: "Ooty, Tamil Nadu", description: "Crisp, cold-chain-fresh iceberg heads for burgers, wraps and salads.", nutrition: { calories: 14, carbs: 3, protein: 0.9, fiber: 1.2 }, tags: ["new"] },
  { id: 25, slug: "cabbage", name: "Cabbage", hindiName: "Patta Gobhi", category: "leafy-greens", price: 30, mrp: 38, unit: "1 pc (~800 g)", emoji: "🥬", tint: "#eaf6e0", rating: 4.3, reviews: 610, organic: false, stock: 70, origin: "Belgaum, Karnataka", description: "Dense, crunchy cabbage heads for coleslaw, stir-fries and sabzi.", nutrition: { calories: 25, carbs: 5.8, protein: 1.3, fiber: 2.5 }, tags: ["deal"] },
  { id: 26, slug: "coriander", name: "Coriander", hindiName: "Dhaniya", category: "herbs", price: 12, mrp: 15, unit: "100 g bunch", emoji: "🌿", tint: "#e3f5df", rating: 4.7, reviews: 2760, organic: true, stock: 200, origin: "Indore, Madhya Pradesh", description: "Fragrant, freshly cut coriander with roots — the garnish that completes every dish.", nutrition: { calories: 23, carbs: 3.7, protein: 2.1, fiber: 2.8 }, tags: ["bestseller"] },
  { id: 27, slug: "mint", name: "Mint", hindiName: "Pudina", category: "herbs", price: 15, mrp: 20, unit: "100 g bunch", emoji: "🍃", tint: "#e0f6ea", rating: 4.6, reviews: 1190, organic: true, stock: 150, origin: "Bengaluru, Karnataka", description: "Cooling mint leaves for chutneys, mojitos and biryani layers.", nutrition: { calories: 44, carbs: 8.4, protein: 3.3, fiber: 6.8 }, tags: [] },
  { id: 28, slug: "curry-leaves", name: "Curry Leaves", hindiName: "Kadi Patta", category: "herbs", price: 10, mrp: 12, unit: "50 g", emoji: "🌿", tint: "#e6f3dc", rating: 4.5, reviews: 640, organic: true, stock: 120, origin: "Coimbatore, Tamil Nadu", description: "Glossy, aromatic leaves that crackle in hot oil — essential for South Indian tadka.", nutrition: { calories: 108, carbs: 18.7, protein: 6.1, fiber: 6.4 }, tags: [] },
  { id: 29, slug: "green-chilli", name: "Green Chilli", hindiName: "Hari Mirch", category: "herbs", price: 18, mrp: 25, unit: "100 g", emoji: "🌶️", tint: "#e7f6e0", rating: 4.4, reviews: 1520, organic: false, stock: 180, origin: "Guntur, Andhra Pradesh", description: "Fiery, fresh green chillies with a bright, grassy heat.", nutrition: { calories: 40, carbs: 9.5, protein: 2, fiber: 1.5 }, tags: ["bestseller"] },
  { id: 30, slug: "lemon", name: "Lemon", hindiName: "Nimbu", category: "herbs", price: 25, mrp: 30, unit: "6 pcs", emoji: "🍋", tint: "#fff8cc", rating: 4.5, reviews: 1850, organic: false, stock: 160, origin: "Tenali, Andhra Pradesh", description: "Thin-skinned, extra-juicy lemons for shikanji, pickles and everything in between.", nutrition: { calories: 29, carbs: 9.3, protein: 1.1, fiber: 2.8 }, tags: ["deal"] },
  { id: 31, slug: "avocado-hass", name: "Hass Avocado", hindiName: "Makhanphal", category: "exotic", price: 199, mrp: 249, unit: "2 pcs", emoji: "🥑", tint: "#e6f2dc", rating: 4.3, reviews: 410, organic: true, stock: 20, origin: "Imported, Tanzania", description: "Creamy, nutty Hass avocados — ready-to-eat in 2 days. Toast, guac, smoothie.", nutrition: { calories: 160, carbs: 8.5, protein: 2, fiber: 6.7 }, tags: ["new"] },
  { id: 32, slug: "broccoli", name: "Broccoli", hindiName: "Hari Gobhi", category: "exotic", price: 79, mrp: 99, unit: "1 pc (~300 g)", emoji: "🥦", tint: "#e3f4e1", rating: 4.4, reviews: 690, organic: true, stock: 45, origin: "Panchgani, Maharashtra", description: "Tight green crowns, steamed or stir-fried — a protein-rich superfood.", nutrition: { calories: 34, carbs: 6.6, protein: 2.8, fiber: 2.6 }, tags: ["bestseller"] },
  { id: 33, slug: "zucchini-green", name: "Green Zucchini", hindiName: "Turai Videshi", category: "exotic", price: 69, mrp: 85, unit: "500 g", emoji: "🥒", tint: "#e4f4de", rating: 4.2, reviews: 230, organic: false, stock: 30, origin: "Nilgiris, Tamil Nadu", description: "Mild, tender zucchini for pastas, grills and low-carb noodles.", nutrition: { calories: 17, carbs: 3.1, protein: 1.2, fiber: 1 }, tags: [] },
  { id: 34, slug: "cherry-tomato", name: "Cherry Tomato", hindiName: "Chhota Tamatar", category: "exotic", price: 59, mrp: 75, unit: "200 g", emoji: "🍅", tint: "#ffe2df", rating: 4.5, reviews: 310, organic: true, stock: 40, origin: "Krishnagiri, Tamil Nadu", description: "Sweet, bite-sized tomatoes that burst with flavour in salads and pastas.", nutrition: { calories: 18, carbs: 3.9, protein: 0.9, fiber: 1.2 }, tags: ["new"] },
  { id: 35, slug: "kiwi", name: "Kiwi", hindiName: "Kiwi", category: "exotic", price: 120, mrp: 150, unit: "3 pcs", emoji: "🥝", tint: "#eef5d8", rating: 4.4, reviews: 520, organic: false, stock: 35, origin: "Imported, New Zealand", description: "Tangy-sweet kiwis loaded with vitamin C — more than an orange, gram for gram.", nutrition: { calories: 61, carbs: 15, protein: 1.1, fiber: 3 }, tags: ["deal"] },
  { id: 36, slug: "dragon-fruit", name: "Dragon Fruit", hindiName: "Kamalam", category: "exotic", price: 89, mrp: 120, unit: "1 pc", emoji: "🐉", tint: "#ffe3f1", rating: 4.1, reviews: 280, organic: false, stock: 25, origin: "Kutch, Gujarat", description: "Striking pink fruit with mildly sweet, speckled flesh. Great in smoothie bowls.", nutrition: { calories: 60, carbs: 13, protein: 1.2, fiber: 3 }, tags: ["new"] },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getRelated(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}

export function discountPercent(p: Pick<Product, "price" | "mrp">): number {
  return Math.round(((p.mrp - p.price) / p.mrp) * 100);
}

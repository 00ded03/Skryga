import type { AppCategory, AppSubcategory } from '../types'

export const expenseCategories: AppCategory[] = [
  {
    key: 'food',
    nameRu: 'Еда и напитки',
    icon: 'ShoppingCart',
    color: '#FF6B6B',
    type: 'expense',
    subcategories: [
      { key: 'groceries', nameRu: 'Продукты', icon: 'ShoppingBag' },
      { key: 'restaurant', nameRu: 'Рестораны', icon: 'UtensilsCrossed' },
      { key: 'delivery', nameRu: 'Доставка', icon: 'Bike' },
      { key: 'sweets', nameRu: 'Сладкое', icon: 'Candy' },
      { key: 'bakery', nameRu: 'Выпечка', icon: 'Coffee' },
      { key: 'drinks', nameRu: 'Напитки', icon: 'Wine' },
      { key: 'alcohol', nameRu: 'Алкоголь', icon: 'Beer' },
      { key: 'coffee', nameRu: 'Кофе', icon: 'Coffee' },
    ],
  },
  {
    key: 'bills',
    nameRu: 'Коммунальные услуги',
    icon: 'Zap',
    color: '#FFB347',
    type: 'expense',
    subcategories: [
      { key: 'electricity', nameRu: 'Электричество', icon: 'Zap' },
      { key: 'water', nameRu: 'Вода', icon: 'Droplets' },
      { key: 'gas_util', nameRu: 'Газ', icon: 'Flame' },
      { key: 'internet', nameRu: 'Интернет', icon: 'Wifi' },
      { key: 'mobile', nameRu: 'Мобильная связь', icon: 'Phone' },
      { key: 'tv', nameRu: 'Кабельное', icon: 'Tv' },
      { key: 'rent', nameRu: 'Аренда и ипотека', icon: 'Home' },
    ],
  },
  {
    key: 'transport',
    nameRu: 'Транспорт',
    icon: 'Car',
    color: '#4ECDC4',
    type: 'expense',
    subcategories: [
      { key: 'fuel', nameRu: 'Бензин', icon: 'Fuel' },
      { key: 'parking', nameRu: 'Парковка', icon: 'ParkingCircle' },
      { key: 'public_transport', nameRu: 'Общественный транспорт', icon: 'Bus' },
      { key: 'taxi', nameRu: 'Такси', icon: 'MapPin' },
      { key: 'car_service', nameRu: 'Техобслуживание', icon: 'Wrench' },
      { key: 'car_insurance', nameRu: 'Страховка', icon: 'Shield' },
    ],
  },
  {
    key: 'health',
    nameRu: 'Здоровье',
    icon: 'Heart',
    color: '#FF8C94',
    type: 'expense',
    subcategories: [
      { key: 'doctor', nameRu: 'Врачи', icon: 'Stethoscope' },
      { key: 'pharmacy', nameRu: 'Аптека', icon: 'Pill' },
      { key: 'tests', nameRu: 'Анализы', icon: 'FlaskConical' },
      { key: 'dentist', nameRu: 'Стоматология', icon: 'Smile' },
      { key: 'optician', nameRu: 'Оптика', icon: 'Eye' },
      { key: 'gym', nameRu: 'Спортзал', icon: 'Dumbbell' },
    ],
  },
  {
    key: 'children',
    nameRu: 'Дети',
    icon: 'Baby',
    color: '#98D8C8',
    type: 'expense',
    subcategories: [
      { key: 'kindergarten', nameRu: 'Сад и школа', icon: 'GraduationCap' },
      { key: 'activities', nameRu: 'Кружки', icon: 'Music' },
      { key: 'kids_clothes', nameRu: 'Детская одежда', icon: 'Shirt' },
      { key: 'toys', nameRu: 'Игрушки', icon: 'Gamepad2' },
      { key: 'school_supplies', nameRu: 'Учебники', icon: 'BookOpen' },
    ],
  },
  {
    key: 'fashion',
    nameRu: 'Одежда и красота',
    icon: 'ShoppingBag',
    color: '#C9B1FF',
    type: 'expense',
    subcategories: [
      { key: 'clothes', nameRu: 'Одежда', icon: 'Shirt' },
      { key: 'shoes', nameRu: 'Обувь', icon: 'Footprints' },
      { key: 'cosmetics', nameRu: 'Косметика', icon: 'Sparkles' },
      { key: 'haircut', nameRu: 'Парикмахерская', icon: 'Scissors' },
      { key: 'nails', nameRu: 'Маникюр', icon: 'Star' },
    ],
  },
  {
    key: 'entertainment',
    nameRu: 'Развлечения',
    icon: 'Film',
    color: '#FFD93D',
    type: 'expense',
    subcategories: [
      { key: 'cinema', nameRu: 'Кино', icon: 'Film' },
      { key: 'events', nameRu: 'Концерты', icon: 'Music2' },
      { key: 'travel', nameRu: 'Путешествия', icon: 'Plane' },
      { key: 'hotels', nameRu: 'Отели', icon: 'Hotel' },
      { key: 'subscriptions', nameRu: 'Подписки', icon: 'MonitorPlay' },
      { key: 'hobbies', nameRu: 'Хобби', icon: 'Palette' },
      { key: 'sports', nameRu: 'Спорт', icon: 'Trophy' },
    ],
  },
  {
    key: 'education',
    nameRu: 'Образование',
    icon: 'BookOpen',
    color: '#6BCB77',
    type: 'expense',
    subcategories: [
      { key: 'courses', nameRu: 'Курсы', icon: 'GraduationCap' },
      { key: 'books', nameRu: 'Книги', icon: 'Book' },
      { key: 'online_edu', nameRu: 'Онлайн-обучение', icon: 'Monitor' },
    ],
  },
  {
    key: 'home',
    nameRu: 'Дом',
    icon: 'Home',
    color: '#845EC2',
    type: 'expense',
    subcategories: [
      { key: 'repairs', nameRu: 'Ремонт', icon: 'Hammer' },
      { key: 'furniture', nameRu: 'Мебель', icon: 'Sofa' },
      { key: 'decor', nameRu: 'Декор', icon: 'Flower2' },
      { key: 'cleaning', nameRu: 'Уборка', icon: 'Sparkles' },
      { key: 'garden', nameRu: 'Сад', icon: 'Leaf' },
    ],
  },
  {
    key: 'gifts',
    nameRu: 'Подарки и пожертвования',
    icon: 'Gift',
    color: '#FF9671',
    type: 'expense',
    subcategories: [
      { key: 'gifts', nameRu: 'Подарки', icon: 'Gift' },
      { key: 'charity', nameRu: 'Благотворительность', icon: 'Heart' },
      { key: 'tsedaka', nameRu: 'Цдака', icon: 'Star' },
    ],
  },
  {
    key: 'finance',
    nameRu: 'Финансы',
    icon: 'CreditCard',
    color: '#0081CF',
    type: 'expense',
    subcategories: [
      { key: 'taxes', nameRu: 'Налоги', icon: 'Receipt' },
      { key: 'insurance', nameRu: 'Страховки', icon: 'Shield' },
      { key: 'bank_fees', nameRu: 'Банк. комиссии', icon: 'Landmark' },
      { key: 'loans', nameRu: 'Кредиты', icon: 'TrendingDown' },
    ],
  },
  {
    key: 'pets',
    nameRu: 'Животные',
    icon: 'PawPrint',
    color: '#F9A825',
    type: 'expense',
    subcategories: [
      { key: 'pet_food', nameRu: 'Корм', icon: 'PawPrint' },
      { key: 'vet', nameRu: 'Ветеринар', icon: 'Stethoscope' },
      { key: 'grooming', nameRu: 'Груминг', icon: 'Scissors' },
    ],
  },
  {
    key: 'other_expense',
    nameRu: 'Прочее',
    icon: 'MoreHorizontal',
    color: '#999999',
    type: 'expense',
    subcategories: [
      { key: 'other', nameRu: 'Прочее', icon: 'MoreHorizontal' },
    ],
  },
]

export const incomeCategories: AppCategory[] = [
  {
    key: 'salary',
    nameRu: 'Зарплата',
    icon: 'Briefcase',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'salary_main', nameRu: 'Основная зарплата', icon: 'DollarSign' },
      { key: 'bonus', nameRu: 'Бонусы', icon: 'TrendingUp' },
      { key: 'overtime', nameRu: 'Переработки', icon: 'Clock' },
    ],
  },
  {
    key: 'freelance',
    nameRu: 'Фриланс',
    icon: 'Laptop',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'freelance_work', nameRu: 'Проекты', icon: 'Laptop' },
      { key: 'consulting', nameRu: 'Консультации', icon: 'MessageSquare' },
    ],
  },
  {
    key: 'rental',
    nameRu: 'Аренда',
    icon: 'Building2',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'rent_income', nameRu: 'Аренда', icon: 'Key' },
    ],
  },
  {
    key: 'investments',
    nameRu: 'Инвестиции',
    icon: 'TrendingUp',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'dividends', nameRu: 'Дивиденды', icon: 'PieChart' },
      { key: 'interest', nameRu: 'Проценты', icon: 'Percent' },
    ],
  },
  {
    key: 'government',
    nameRu: 'Государственные выплаты',
    icon: 'Landmark',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'bituah_leumi', nameRu: 'Битуах Леуми', icon: 'Shield' },
      { key: 'child_allowance', nameRu: 'Пособие на детей', icon: 'Baby' },
    ],
  },
  {
    key: 'refunds',
    nameRu: 'Возвраты',
    icon: 'RotateCcw',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'tax_refund', nameRu: 'Налоговый возврат', icon: 'Receipt' },
      { key: 'purchase_refund', nameRu: 'Возврат', icon: 'ArrowLeft' },
    ],
  },
  {
    key: 'other_income',
    nameRu: 'Прочий доход',
    icon: 'Plus',
    color: '#30D158',
    type: 'income',
    subcategories: [
      { key: 'other', nameRu: 'Прочий доход', icon: 'Plus' },
    ],
  },
]

export const allCategories: AppCategory[] = [...expenseCategories, ...incomeCategories]

export function getCategoryByKey(key: string): AppCategory | undefined {
  return allCategories.find((c) => c.key === key)
}

export function getSubcategoryByKey(categoryKey: string, subKey: string): AppSubcategory | undefined {
  const category = getCategoryByKey(categoryKey)
  return category?.subcategories.find((s) => s.key === subKey)
}

export function getCategoryName(key: string): string {
  return getCategoryByKey(key)?.nameRu ?? key
}

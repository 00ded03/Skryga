// CategoryData.swift
// Skryga — Static category / subcategory data (not SwiftData — pure value types)

import Foundation

// MARK: - Category Type

enum CategoryType: String, Codable, CaseIterable {
    case expense = "expense"
    case income  = "income"
    case savings = "savings"
}

// MARK: - Subcategory

struct AppSubcategory: Identifiable, Hashable {
    /// Unique key within its parent category, e.g. "groceries".
    let key: String
    /// Localised Russian name shown in the UI.
    let nameRu: String
    /// SF Symbol name.
    let icon: String

    var id: String { key }

    // MARK: Convenience aliases

    /// Alias for `nameRu` — used by view code.
    var name: String { nameRu }
    /// Alias for `icon` — matches SF Symbol naming convention used in views.
    var iconName: String { icon }
}

// MARK: - Category

struct AppCategory: Identifiable, Hashable {
    /// Unique key across all categories, e.g. "food".
    let key: String
    /// Localised Russian name shown in the UI.
    let nameRu: String
    /// SF Symbol name.
    let icon: String
    /// Hex accent color for this category.
    let color: String
    /// Whether this is an expense, income, or savings category.
    let type: CategoryType
    /// Child subcategories.
    let subcategories: [AppSubcategory]

    var id: String { key }

    // MARK: Convenience aliases

    /// Alias for `nameRu` — used by view code that references `.name`.
    var name: String { nameRu }
    /// Alias for `icon` — used by view code that references `.iconName`.
    var iconName: String { icon }
}

// MARK: - Category Data

enum CategoryData {

    // MARK: Expense Categories

    static let allExpenseCategories: [AppCategory] = [

        AppCategory(
            key: "food",
            nameRu: "Питание",
            icon: "fork.knife",
            color: "#FF6B35",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "groceries",         nameRu: "Продукты",             icon: "cart.fill"),
                AppSubcategory(key: "restaurant",        nameRu: "Рестораны",            icon: "fork.knife.circle.fill"),
                AppSubcategory(key: "delivery",          nameRu: "Доставка еды",         icon: "bicycle"),
                AppSubcategory(key: "sweets",            nameRu: "Сладкое и десерты",    icon: "birthday.cake.fill"),
                AppSubcategory(key: "bakery",            nameRu: "Выпечка и хлеб",       icon: "bag.fill"),
                AppSubcategory(key: "drinks",            nameRu: "Напитки",              icon: "cup.and.saucer.fill"),
                AppSubcategory(key: "alcohol",           nameRu: "Алкоголь",             icon: "wineglass.fill"),
                AppSubcategory(key: "coffee",            nameRu: "Кофе",                 icon: "cup.and.saucer.fill"),
            ]
        ),

        AppCategory(
            key: "bills",
            nameRu: "Счета и ЖКХ",
            icon: "bolt.fill",
            color: "#F59E0B",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "electricity",       nameRu: "Электричество",        icon: "bolt.fill"),
                AppSubcategory(key: "water",             nameRu: "Вода",                 icon: "drop.fill"),
                AppSubcategory(key: "gas",               nameRu: "Газ",                  icon: "flame.fill"),
                AppSubcategory(key: "internet",          nameRu: "Интернет",             icon: "wifi"),
                AppSubcategory(key: "mobile",            nameRu: "Мобильная связь",      icon: "phone.fill"),
                AppSubcategory(key: "tv",                nameRu: "Кабельное ТВ",         icon: "tv.fill"),
                AppSubcategory(key: "rent",              nameRu: "Аренда / Ипотека",     icon: "house.fill"),
            ]
        ),

        AppCategory(
            key: "transport",
            nameRu: "Транспорт",
            icon: "car.fill",
            color: "#3B82F6",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "fuel",              nameRu: "Бензин",               icon: "fuelpump.fill"),
                AppSubcategory(key: "parking",           nameRu: "Парковка",             icon: "parkingsign.circle.fill"),
                AppSubcategory(key: "public_transport",  nameRu: "Общественный транспорт", icon: "bus.fill"),
                AppSubcategory(key: "taxi",              nameRu: "Такси и райдшеринг",   icon: "car.circle.fill"),
                AppSubcategory(key: "car_service",       nameRu: "Техобслуживание",      icon: "wrench.and.screwdriver.fill"),
                AppSubcategory(key: "car_insurance",     nameRu: "Страховка авто",       icon: "shield.lefthalf.filled"),
            ]
        ),

        AppCategory(
            key: "health",
            nameRu: "Здоровье",
            icon: "heart.fill",
            color: "#EF4444",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "doctor",            nameRu: "Врачи",                icon: "stethoscope"),
                AppSubcategory(key: "pharmacy",          nameRu: "Аптека",               icon: "pills.fill"),
                AppSubcategory(key: "tests",             nameRu: "Анализы",              icon: "cross.vial.fill"),
                AppSubcategory(key: "dentist",           nameRu: "Стоматология",         icon: "mouth.fill"),
                AppSubcategory(key: "optician",          nameRu: "Очки и линзы",         icon: "eyeglasses"),
                AppSubcategory(key: "gym",               nameRu: "Спортзал",             icon: "dumbbell.fill"),
            ]
        ),

        AppCategory(
            key: "children",
            nameRu: "Дети",
            icon: "figure.child",
            color: "#8B5CF6",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "kindergarten",      nameRu: "Детский сад и школа",  icon: "building.columns.fill"),
                AppSubcategory(key: "activities",        nameRu: "Кружки и секции",      icon: "figure.run"),
                AppSubcategory(key: "kids_clothes",      nameRu: "Детская одежда",       icon: "tshirt.fill"),
                AppSubcategory(key: "toys",              nameRu: "Игрушки",              icon: "gamecontroller.fill"),
                AppSubcategory(key: "school_supplies",   nameRu: "Учебники",             icon: "book.fill"),
            ]
        ),

        AppCategory(
            key: "fashion",
            nameRu: "Одежда и красота",
            icon: "bag.fill",
            color: "#EC4899",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "clothes",           nameRu: "Одежда",               icon: "tshirt.fill"),
                AppSubcategory(key: "shoes",             nameRu: "Обувь",                icon: "shoeprints.fill"),
                AppSubcategory(key: "cosmetics",         nameRu: "Косметика",            icon: "sparkles"),
                AppSubcategory(key: "haircut",           nameRu: "Парикмахерская",       icon: "scissors"),
                AppSubcategory(key: "nails",             nameRu: "Маникюр и педикюр",    icon: "hand.raised.fill"),
            ]
        ),

        AppCategory(
            key: "entertainment",
            nameRu: "Развлечения",
            icon: "popcorn.fill",
            color: "#F97316",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "cinema",            nameRu: "Кино и театр",         icon: "film.fill"),
                AppSubcategory(key: "events",            nameRu: "Концерты",             icon: "music.note"),
                AppSubcategory(key: "travel",            nameRu: "Путешествия",          icon: "airplane"),
                AppSubcategory(key: "hotels",            nameRu: "Отели",                icon: "bed.double.fill"),
                AppSubcategory(key: "subscriptions",     nameRu: "Подписки",             icon: "repeat.circle.fill"),
                AppSubcategory(key: "hobbies",           nameRu: "Хобби",                icon: "paintpalette.fill"),
                AppSubcategory(key: "sports",            nameRu: "Спорт",                icon: "soccerball"),
            ]
        ),

        AppCategory(
            key: "education",
            nameRu: "Образование",
            icon: "book.fill",
            color: "#06B6D4",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "courses",           nameRu: "Курсы",                icon: "graduationcap.fill"),
                AppSubcategory(key: "books",             nameRu: "Книги",                icon: "books.vertical.fill"),
                AppSubcategory(key: "online_edu",        nameRu: "Онлайн-обучение",      icon: "laptopcomputer"),
            ]
        ),

        AppCategory(
            key: "home",
            nameRu: "Дом",
            icon: "house.fill",
            color: "#10B981",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "repairs",           nameRu: "Ремонт",               icon: "hammer.fill"),
                AppSubcategory(key: "furniture",         nameRu: "Мебель и техника",     icon: "sofa.fill"),
                AppSubcategory(key: "decor",             nameRu: "Декор",                icon: "lamp.ceiling.fill"),
                AppSubcategory(key: "cleaning",          nameRu: "Уборка",               icon: "bubbles.and.sparkles.fill"),
                AppSubcategory(key: "garden",            nameRu: "Сад",                  icon: "leaf.fill"),
            ]
        ),

        AppCategory(
            key: "gifts",
            nameRu: "Подарки",
            icon: "gift.fill",
            color: "#D946EF",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "gifts",             nameRu: "Подарки",              icon: "gift.fill"),
                AppSubcategory(key: "charity",           nameRu: "Благотворительность",  icon: "heart.circle.fill"),
                AppSubcategory(key: "tsedaka",           nameRu: "Цдака",                icon: "star.of.david"),
            ]
        ),

        AppCategory(
            key: "finance",
            nameRu: "Финансы",
            icon: "creditcard.fill",
            color: "#64748B",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "taxes",             nameRu: "Налоги",               icon: "doc.text.fill"),
                AppSubcategory(key: "insurance",         nameRu: "Страховки",            icon: "shield.fill"),
                AppSubcategory(key: "bank_fees",         nameRu: "Банковские комиссии",  icon: "building.columns.fill"),
                AppSubcategory(key: "loans",             nameRu: "Кредиты",              icon: "arrow.left.arrow.right.circle.fill"),
            ]
        ),

        AppCategory(
            key: "pets",
            nameRu: "Животные",
            icon: "pawprint.fill",
            color: "#92400E",
            type: .expense,
            subcategories: [
                AppSubcategory(key: "pet_food",          nameRu: "Корм",                 icon: "fork.knife"),
                AppSubcategory(key: "vet",               nameRu: "Ветеринар",            icon: "cross.fill"),
                AppSubcategory(key: "grooming",          nameRu: "Груминг",              icon: "scissors"),
            ]
        ),

        AppCategory(
            key: "other_expense",
            nameRu: "Прочее",
            icon: "ellipsis.circle.fill",
            color: "#94A3B8",
            type: .expense,
            subcategories: []
        ),
    ]

    // MARK: Income Categories

    static let allIncomeCategories: [AppCategory] = [

        AppCategory(
            key: "salary",
            nameRu: "Зарплата",
            icon: "briefcase.fill",
            color: "#30D158",
            type: .income,
            subcategories: [
                AppSubcategory(key: "salary_main",       nameRu: "Основная зарплата",    icon: "banknote.fill"),
                AppSubcategory(key: "bonus",             nameRu: "Бонусы",               icon: "gift.fill"),
                AppSubcategory(key: "overtime",          nameRu: "Переработки",          icon: "clock.fill"),
            ]
        ),

        AppCategory(
            key: "freelance",
            nameRu: "Фриланс",
            icon: "laptopcomputer",
            color: "#2D6CDF",
            type: .income,
            subcategories: [
                AppSubcategory(key: "freelance_work",    nameRu: "Проекты",              icon: "doc.fill"),
                AppSubcategory(key: "consulting",        nameRu: "Консультации",         icon: "person.fill.questionmark"),
            ]
        ),

        AppCategory(
            key: "rental",
            nameRu: "Аренда недвижимости",
            icon: "building.2.fill",
            color: "#7B5CF0",
            type: .income,
            subcategories: []
        ),

        AppCategory(
            key: "investments",
            nameRu: "Инвестиции",
            icon: "chart.line.uptrend.xyaxis",
            color: "#06B6D4",
            type: .income,
            subcategories: [
                AppSubcategory(key: "dividends",         nameRu: "Дивиденды",            icon: "arrow.up.right.circle.fill"),
                AppSubcategory(key: "interest",          nameRu: "Проценты",             icon: "percent"),
            ]
        ),

        AppCategory(
            key: "government",
            nameRu: "Государственные выплаты",
            icon: "building.columns.fill",
            color: "#F59E0B",
            type: .income,
            subcategories: [
                AppSubcategory(key: "bituah_leumi",      nameRu: "Битуах Леуми",         icon: "person.fill.checkmark"),
                AppSubcategory(key: "child_allowance",   nameRu: "Пособие на детей",     icon: "figure.child"),
            ]
        ),

        AppCategory(
            key: "refunds",
            nameRu: "Возвраты",
            icon: "arrow.uturn.backward.circle",
            color: "#10B981",
            type: .income,
            subcategories: [
                AppSubcategory(key: "tax_refund",        nameRu: "Налоговый возврат",    icon: "doc.text.fill"),
                AppSubcategory(key: "purchase_refund",   nameRu: "Возврат покупки",      icon: "arrow.uturn.left.circle.fill"),
            ]
        ),

        AppCategory(
            key: "other_income",
            nameRu: "Прочий доход",
            icon: "plus.circle.fill",
            color: "#94A3B8",
            type: .income,
            subcategories: []
        ),
    ]

    // MARK: All Categories

    /// All expense + income categories combined (property form).
    static var allCategories: [AppCategory] {
        allExpenseCategories + allIncomeCategories
    }

    /// All expense + income categories combined (function form for call-site compatibility).
    static func allCategories() -> [AppCategory] {
        allExpenseCategories + allIncomeCategories
    }

    // MARK: Lookup Helpers

    /// Returns the `AppCategory` for the given key, or `nil` if not found.
    static func category(forKey key: String) -> AppCategory? {
        allCategories.first { $0.key == key }
    }

    /// Returns the Russian display name for the given category key.
    static func categoryName(forKey key: String) -> String {
        category(forKey: key)?.nameRu ?? key
    }

    /// Returns the Russian display name for a subcategory, or `nil` if key is empty / not found.
    /// Accepts an optional subcategoryKey so views can pass `txn.subcategoryKey` directly.
    static func subcategoryName(categoryKey: String, subcategoryKey: String?) -> String? {
        guard let key = subcategoryKey, !key.isEmpty else { return nil }
        return category(forKey: categoryKey)?
            .subcategories
            .first { $0.key == key }?
            .nameRu
    }

    /// Returns categories filtered by a typed `CategoryType`.
    static func categories(ofType type: CategoryType) -> [AppCategory] {
        allCategories.filter { $0.type == type }
    }

    /// Returns categories filtered by a raw type string ("expense" / "income" / "savings").
    /// Convenience overload used by view code that stores `transactionType` as a String.
    static func categories(forType typeString: String) -> [AppCategory] {
        guard let type = CategoryType(rawValue: typeString) else { return [] }
        return categories(ofType: type)
    }

    /// Returns the first `AppSubcategory` matching both keys.
    static func subcategory(categoryKey: String, subcategoryKey: String) -> AppSubcategory? {
        category(forKey: categoryKey)?
            .subcategories
            .first { $0.key == subcategoryKey }
    }
}

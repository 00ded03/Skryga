// FamilyMember.swift
// Skryga — SwiftData model representing a family member profile

import Foundation
import SwiftData

// MARK: - Family Member Model

@Model
final class FamilyMember {

    // MARK: Stored Properties

    var id: UUID
    /// Display name, e.g. "Муж" or "Жена".
    var name: String
    /// Semantic role identifier: "husband" or "wife".
    var role: String
    /// Single-character emoji avatar, e.g. "👨" or "👩".
    var emoji: String
    /// Hex color string for this member's accent color, e.g. "#2D6CDF".
    var colorHex: String

    // MARK: Initializer

    init(
        id: UUID = UUID(),
        name: String,
        role: String,
        emoji: String,
        colorHex: String
    ) {
        self.id = id
        self.name = name
        self.role = role
        self.emoji = emoji
        self.colorHex = colorHex
    }

    // MARK: Computed Properties

    /// `true` when this member's role is "husband".
    var isHusband: Bool { role == "husband" }

    /// `true` when this member's role is "wife".
    var isWife: Bool { role == "wife" }

    /// First character of the name, used as an avatar fallback initial.
    var initial: String {
        String(name.prefix(1)).uppercased()
    }
}

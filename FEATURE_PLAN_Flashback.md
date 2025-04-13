# Flashback Feature Implementation Plan

This document outlines the plan to implement the Flashback mechanic from the Eat the Reich ruleset into the Foundry VTT system.

## Core Requirements

Based on the rules (`raw/ETR-Rules.md`, lines 493-517), the Flashback mechanic allows a player to re-roll a failed action (2 or fewer successes) once per session by describing a relevant past event.

## Implementation Plan

1.  **Store Roll Configuration:**
    *   Modify `EatTheReichCharacterSheet._onRoll` to store the base stat value, equipment dice count, ability dice count, and the stat label as flags on the `ChatMessage` object when it's created.
    *   Example flag structure: `message.flags.eat-the-reich = { rollConfig: { statValue: 3, equipmentDice: 1, abilityDice: 0, statLabel: "BRAWL" } }`

2.  **Enhance Chat Message Rendering:**
    *   Modify `templates/chat/die-pool-output.hbs` to include a conditional button element for the flashback.
    *   Modify `DiceAllocation.onRenderChatMessage` (or create a new helper function called by it):
        *   Check if the message has the `rollConfig` flag.
        *   Check if the message actor belongs to the current user (or user is GM).
        *   Calculate the number of successes (dice >= 4) from `message.rolls[0].results`.
        *   If successes <= 2, make the button visible and add necessary data attributes (`data-action="flashback"`, `data-message-id`, `data-actor-id`).
        *   *Note: Per user feedback, session tracking/disabling the button after use is deferred.*

3.  **Implement Flashback Logic:**
    *   Add a new click listener in `DiceAllocation.chatListeners` for `[data-action="flashback"]`.
    *   Create a new handler function (`_handleFlashbackClick`):
        *   Retrieve message, actor, and `rollConfig` flag.
        *   Verify permissions.
        *   **Show Flashback Dialog:** Create a new dialog offering flexibility:
            *   **Context:** Randomize button, Dropdown (populated from rules initially), Custom text input.
            *   **Question:** Randomize button, Dropdown (populated from rules initially), Custom text input.
            *   **Character:** Randomize button, Dropdown (populated with other present PCs), potentially a custom input.
            *   **Description:** Text area for player input.
        *   **On Dialog Confirmation:**
            *   Calculate the new dice pool: `rollConfig.statValue + rollConfig.equipmentDice + rollConfig.abilityDice + 2`.
            *   Perform the new roll.
            *   Create a *new* `ChatMessage` displaying the chosen/entered flashback details (Context, Question, Character involved, Description) and the new roll results (using the same `die-pool-output.hbs` template).

4.  **Localization:**
    *   Add necessary strings to `lang/en.json` for buttons, dialogs, prompts, etc.

## Visual Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Player
    participant CharacterSheet
    participant ChatLog
    participant ChatMessage
    participant DiceAllocation
    participant FlashbackDialog
    participant Actor

    Player->>CharacterSheet: Clicks Stat Button
    CharacterSheet->>CharacterSheet: Opens Bonus Dice Dialog
    Player->>CharacterSheet: Confirms Bonus Dice
    CharacterSheet->>ChatMessage: Creates Message (with rollConfig flag)
    ChatMessage-->>ChatLog: Displays Message
    DiceAllocation->>ChatMessage: onRenderChatMessage hook
    DiceAllocation->>ChatMessage: Reads rollConfig flag & results
    alt Successes <= 2
        DiceAllocation->>ChatMessage: Shows Flashback Button
    end

    Player->>ChatLog: Clicks Flashback Button
    DiceAllocation->>ChatMessage: _handleFlashbackClick
    DiceAllocation->>Actor: Get Actor data (for speaker info)
    DiceAllocation->>FlashbackDialog: Creates & Shows Dialog (Context/Question/Character/Description options)
    Player->>FlashbackDialog: Fills in details & Confirms
    FlashbackDialog->>DiceAllocation: Returns flashback details
    DiceAllocation->>DiceAllocation: Calculates new dice pool (original + 2)
    DiceAllocation->>DiceAllocation: Performs new Roll
    DiceAllocation->>ChatMessage: Creates *New* Message (Flashback details + New Roll)
    ChatMessage-->>ChatLog: Displays New Message
```

## Stretch Goals (Post-MVP)

*   Populate Context/Question dropdowns from Foundry Settings.
*   Refine the Character selection UI/logic.
*   Implement automated session tracking for flashback usage reset.
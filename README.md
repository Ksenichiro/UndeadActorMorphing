# Token Morphing Macro

## Last Tested Specs

- Foundry VTT: `13.351`
- D&D system/module: `5.2.2`

## How to Add This to the Macro Bar

1. In Foundry VTT, open the **Macro Directory**.
2. Create a new macro.
3. Give it a name such as `Token Morphing Template`.
4. Set the macro type to `Script`.
5. Copy the contents of [TokenMorfingTemplate.js] into the macro command field.
6. Save the macro.
7. Drag the macro onto an empty slot in the macro bar.

## What It Does

This macro is designed for quickly converting selected tokens into undead variants.

When you run it:

- It checks the tokens currently selected on the canvas.
- It opens a dialog where you choose which of those selected tokens should be included in the working pool.
- It lets you apply one of two templates: `Skeletify` or `Zombify`.
- It can either edit the existing actors directly or create new actor copies first by enabling `Create Actors`.

### Skeletify

The skeleton template updates the actor to an undead-style skeleton variant. It:

- Changes type and alignment.
- Adjusts mental ability scores.
- Adds or merges relevant resistances, immunities, and senses.
- Adds the `Undead Nature` feature.

If `Create Actors` is enabled, the macro creates a new actor in the `Skeletons` folder and appends `Skeleton` to the actor name.

### Zombify

The zombie template updates the actor to an undead-style zombie variant. It:

- Changes type and alignment.
- Adjusts mental ability scores.
- Adds or merges relevant immunities and senses.
- Removes languages and spellcasting values where those fields exist.
- Adds the `Undead Fortitude` feature with a built-in `1d6` roll.

If `Create Actors` is enabled, the macro creates a new actor in the `Zombies` folder and appends `Zombie` to the actor name.

## Notes

- The macro works on selected tokens on the current canvas.
- If multiple selected tokens point to the same actor, that actor is only processed once per run.
- If no token is selected, the macro shows a warning and does nothing.

## Template resourses

This macro was created for templates of Conflux Creatures skeletons and zombies with idea to use them in pair with Summon Undead from Spells that don't Suck compendium.

- Conflux Creatures Patreon: https://www.patreon.com/c/confluxcreatures/
- Skeleton template: https://homebrewery.naturalcrit.com/share/wwx8AHLNOu0U
- Zombie template: https://homebrewery.naturalcrit.com/share/1H-v56SCMOyK58yUUoTL_SiTL2PGGqqXd-cAwwkaCLE-n
- STDS: https://www.gmbinder.com/share/-NR0OWlW60yv2EfA3qQp

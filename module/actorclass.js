export class WOINActor extends Actor {

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    const actorData = this;
    const data = actorData.system;

    console.log("WOIN | actorclass.js prepareDerivedData beginning actorData", actorData);
    if (actorData.type !== "character") return;

    // -----------------------------------------------------------------------
    // Advancement
    // -----------------------------------------------------------------------
    let xp = 0;
    for (const entry of data.advancement.xp_gain ?? []) {
      xp += parseInt(entry.value || 0);
    }
    for (const entry of data.advancement.xp_spent ?? []) {
      xp -= parseInt(entry.value || 0);
    }
    data.advancement.xp_total = xp;

    const grade = parseInt(data.advancement.grade);
    if (!Number.isNaN(grade)) {
      if (grade < 6) data.advancement.dice_cap = 5;
      else if (grade < 8) data.advancement.dice_cap = 6;
      else if (grade < 11) data.advancement.dice_cap = 7;
      else if (grade < 15) data.advancement.dice_cap = 8;
      else if (grade < 20) data.advancement.dice_cap = 9;
      else data.advancement.dice_cap = 10;
    }

    // -----------------------------------------------------------------------
    // Exploit styling
    // -----------------------------------------------------------------------
    for (const item of actorData.items) {
      if (item.type !== "exploit") continue;
      const isys = item.system;
      isys.style = "";

      if (isys.modifier) {
        if (isys.modifier.includes("uni_exploit")) isys.style = "uni";
        if (isys.modifier.includes("psi_exploit")) isys.style = "psi";
      }
    }

    // -----------------------------------------------------------------------
    // Carry / Items / Weapon skill damage
    // -----------------------------------------------------------------------
    if (!data.carry) data.carry = {};
    data.carry.carried = 0;

    for (const item of actorData.items) {
      if (item.type !== "item") continue;

      const isys = item.system;

      if (isys.carried === true) {
        data.carry.carried += (isys.weight || 0) * (isys.quantity || 0);

        // weapon skill damage / attack
        if (isys.weapon && isys.skill) {
          isys.weapon.skilldamage ??= 0;
          let pool = data.attributes[isys.skill.toLowerCase()];
          isys.error = "";

          if (!pool) {
            for (const skill of actorData.items) {
              if (skill.type !== "skill") continue;
              if (skill.name.toLowerCase() !== isys.skill.toLowerCase()) continue;

              const ss = skill.system;
              pool = ss.gradepool + ss.pool;
              if (ss.pool !== isys.weapon.skilldamage) {
                isys.weapon.skilldamage = ss.pool;
              }
              isys.error = "";
            }
          } else {
            pool = pool.dice;
          }

          if (pool != null) {
            pool += isys.weapon.bonus_attack || 0;
            if (!isys.weapon.attack || pool !== isys.weapon.attack) {
              isys.weapon.attack = pool;
            }
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // Initiative
    // -----------------------------------------------------------------------
    data.initiative.error = "error-red";
    data.initiative.value = 0;

    const att = data.attributes[data.initiative.skill];
    if (att) {
      data.initiative.value = att.dice;
      data.initiative.error = "";
    } else {
      for (const skill of actorData.items) {
        if (skill.type !== "skill") continue;
        if (skill.name.toLowerCase() !== data.initiative.skill.toLowerCase()) continue;

        const ss = skill.system;
        data.initiative.value = ss.pool + ss.gradepool;
        data.initiative.error = "";
      }
    }

    const cap = data.advancement.dice_cap ?? data.initiative.value ?? 0;
    data.initiative.value = Math.max(0, Math.min(data.initiative.value ?? 0, cap));
    data.initiative.value =
      parseInt(data.initiative.value || 0) + parseInt(data.initiative.mod || 0);

    // -----------------------------------------------------------------------
    // Credits / Net Worth
    // -----------------------------------------------------------------------
    data.net_worth = data.credits || 0;
    for (const item of actorData.items) {
      if (item.type !== "item") continue;
      const isys = item.system;
      if (Number.isFinite(isys.cost) && Number.isFinite(isys.quantity)) {
        data.net_worth += isys.cost * isys.quantity;
      }
    }

    console.log("WOIN | actorclass.js prepareDerivedData ending actorData", actorData);
  }
}

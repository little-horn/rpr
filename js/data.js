const defaultAction = {
  name: "Skill",
  cast: 2,
  recast: 2.5,
  white: 0,
  black: 0,
  potency: 0,
  comboPotency: 0,
  description: `Does damage.`,
  mana: 0,
  animationLock: 0.8,
  recastGroup() {
    return this.type == "ability" ? this.id : "global";
  },
  comboActions: [],
  combo(state) {
    if(state.lastActionTime + 8000 > state.currentTime && this.comboActions.includes(state.lastAction)) {
      var action = getAction(state.lastAction);
      return action.comboActions.length > 0 ? state.lastCombo : true;
    }
    return false;
  },
  execute(state) {
    // no-op
  },
  useable(state) {
    return true;
  },
  highlight(state) {
    return false;
  },
  transform(state) {
    return false;
  },
  calculatePotency(state) {
    if(this.comboActions.length == 0)
      return this.potency;
    return this.combo(state) ? this.comboPotency : this.potency;
  }
};

/*
verholy: {
    name: "Verholy",
    type: "spell",
    cast: 0,
    comboPotency: 550,
    comboActions: ["enchanted_redoublement"],
*/

const actions = {
  slice: {
    name: "Slice",
    type: "weaponskill",
    cast: 0,
    soul: 10,
    potency: 300,
    description: `Delivers an attack with a potency of 300.
    <span class="green">Additional Effect:</span> Increases <span class="orange">Soul Guage</span> by 10.`,
    execute(state) {
      setStatus('impact', true);
    }
  },
  waxingSlice: {
    name: "Waxing Slice",
    type: "weaponskill",
    cast: 0,
    soul: 10,
    comboPotency: 380,
    comboActions: ["slice"],
    description: `Delivers an attack with a potency of 140.
    <span class="green">Combo Action:</span> <span class="orange">Slice.</span>
    <span class="green">Combo Potency:</span> 380
    <span class="green">Combo Bonus:</span> Increases <span class="orange">Soul Guage</span> by 10.`,
    useable(state) {
      return this.combo(state);
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  infernalSlice: {
    name: "Infernal Slice",
    type: "weaponskill",
    cast: 0,
    soul: 10,
    comboPotency: 460,
    comboActions: ["waxingSlice"],
    description: `Delivers an attack with a potency of 140.
    <span class="green">Combo Action:</span> <span class="orange">Waxing Slice.</span>
    <span class="green">Combo Potency:</span> 460
    <span class="green">Combo Bonus:</span> Increases <span class="orange">Soul Guage</span> by 10.`,
    useable(state) {
      return this.combo(state);
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  shadowOfDeath: {
    name: "Shadow of Death",
    type: "weaponskill",
    cast: 0,
    soul: 10,
    potency: 300,
    description: `Delivers an attack with a potency of 300.
    <span class="green">Additional Effect:</span> Afflicts target with <span class="yellow">Death's Design</span>, increasing damage you deal target by 10%
    <span class="green">Duration:</span> 30s
    Extends duration of <span class="yellow">Death's Design</span> by 30s to a maximum of 60s.
    <span class="green">Additional Effect:</span> Increases Soul Gauge by 10 if target is KO'd before effect expires`
  },
  soulSlice: {
    name: "Soul Slice",
    type: "weaponskill",
    cast: 0,
    soul: 50,
    charges: 2,
    recharge: 30,
    potency: 460,
    description: `Delivers an attack with a potency of 460.
    <span class="green">Additional Effect:</span> Increases <span class="orange">Soul Gauge</span> by 50
    <span class="green">Maximum Charges:</span> 2
    Shares a recast timer with <span class="orange">Soul Scythe</span>.`,
    execute(state) {
      state.soulSliceCharge--;
      addTimer(recharge, 30000);
      function recharge() {
        state.soulSliceCharge++;
        state.soulSliceCharge = Math.min(state.soulSliceCharge, 2);
        if (state.soulSliceCharge != 2) {
          addTimer(recharge, 30000);
        }
      }
    },
    useable(state) {
      return state.soulSliceCharge > 0;
    }
  },
  harpe: {
    name: "Harpe",
    type: "spell",
    cast: 1.3,
    potency: 300,
    description: `Deals unaspected damage with a potency of 300.`
  },
  soulSow: {
    name: "Soul Sow",
    type: "spell",
    cast: 0,
    description: `Grants <span class="yellow">Soulsow</span> to self, changing the action to <span class="orange">Harvest Moon</span>.
    Cast time is instant when used outside of battle.`,
    execute(state) {
      setStatus("soulSow", true);
    },
    transform(state) {
      return (hasStatus("soulSow")) ? "harvestMoon" : false;
    }
  },
  harvestMoon: {
    name: "Harvest Moon",
    type: "spell",
    cast: 0,
    comboPotency: 600,
    comboActions: ["soulSow"],
    description: `Deals unaspected damage to target and all enemies nearby it with a potency of 600 for the first enemy, and 50% less for all remaining enemies.
    Can only be executed while under the effect of <span class="yellow">Soulsow</span>.`,
    /*useable(state) {
      return this.combo(state);
    },*/
    highlight(state) {
      return hasStatus("soulSow");
    },
    execute(state) {
      setStatus("soulSow", false);
    }
  },
  arcaneCircle: {
    name: "Arcane Circle",
    type: "ability",
    cast: 0,
    recast: 120,
    description: `Increases damage dealt by self and nearby party members by 3%.
    <span class="green">Duration</span>: 20s
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Circle of Sacrifice</span> to self and nearby party members
    Duration: 5s
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Bloodsown Circle</span> to self
    <span class="green">Duration:</span> 6s
    <span class="green">Circle of Sacrifice Effect:</span> When you or party members under this effect successfully land a weaponskill or cast a spell, the reaper who applied it may be granted a stack of <span class="yellow">Immortal Sacrifice</span>, up to a maximum of 8
    <span class="green">Duration:</span> 30s
    <span class="green">Bloodsown Circle Effect:</span> Allows you to accumulate stacks of <span class="yellow">Immortal Sacrifice</span> from party members under the effect of your <span class="yellow">Circle of Sacrifice</span>`,
    execute(state) {
      setStatus("arcaneCircle", true);
      function resetDamage() {
        state.arcaneCircleDamage = 0;
      }
      state.arcaneCircleDamage = 0.03;
      addTimer(resetDamage, 20000);
      setStatus("circleOfSacrifice", true);
      setStatus("bloodswornCircle", true);
    }
  },
  plentifulHarvest: {
    name: "Plentiful Harvest",
    type: "weaponskill",
    cast: 0,
    shroud: 50,
    comboPotency: 520,
    comboActions: ["arcaneCircle"],
    description: `Delivers an attack to all enemies in a straight linebefore you with a potency of 520 for the first enemy, and 60% less for all remaining enemies.
    <span class="green">Immortal Sacrifice Cost:</span> 1 stack
    Potency increases up to 800 as stacks of <span class="yellow">Immortal Sacrifice</span> exceed minimum cost.
    <span class="green">Additional Effect:</span> Increases <span class="orange">Shroud Gauge</span> by 50
    Cannot be executed while under the effect of <span class="yellow">Bloodsown Circle</span>.
    Consumes all stacks of <span class="yellow">Immortal Sacrifice</span> upon execution.`,
    execute(state) {
      setStatus("bloodswornCircle", false);
      setStatus("circleOfSacrifice", false);
    },
    useable(state) {
      return hasStatus("bloodswornCircle");
    }
  },
  gluttony: {
    name: "Gluttony",
    type: "ability",
    cast: 0,
    soul: -50,
    recast: 60,
    soulReaver: 2,
    potency: 500,
    description: `Summon your avatar to deal unaspected damage to target and all enemies nearby it with a potency of 500 for the first enemy, and 25% less for all remaining enemies.
    <span class="green">Additional Effect:</span> Grants 2 stacks of <span class="yellow">Soul Reaver</span>
    <span class="green">Duration:</span> 30s
    <span class="green">Soul Gauge Cost:</span> 50`,
    useable(state) {
      return state.gauge.soul >= 50;
    }
  },
  bloodstalk: {
    name: "Blood Stalk",
    type: "ability",
    cast: 0,
    soul: -50,
    recast: 1,
    soulReaver: 1,
    potency: 400,
    description: `Summon your avatar to deliver an attack with a potency of 400.
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Soul Reaver</span>
    <span class="green">Duration:</span> 30s
    Stack count will be reduced to 1 when already under the effect of <span class="yellow">Soul Reaver.</span>
    <span class="green">Soul Gauge Cost:</span> 50
    *Action changes to <span class="orange">Lemure's Slice</span> while under the effect of <span class="yellow">Enshrouded</span>.`,
    transform(state) {
      //return (state.enhancedGallows == true) ? "enchanted_riposte" : false;
      if (hasStatus("enhancedGallows")) {
        return "unveiledGallows";
      }
      else if (hasStatus("enhancedGibbet")) {
        return "unveiledGibbet";
      }
      else if (hasStatus("enshrouded")) {
        return "lemuresSlice";
      }
      else {
        return false; 
      }
    },
    useable(state) {
      return state.gauge.soul >= 50;
    },
    execute(state) {
      if (!hasStatus("enhancedGallows") || !hasStatus("enhancedGibbet")) {
        setStatus("soulReaver", true);
      }
      // setStatus("soulReaver", true);
      // setStatus("enhancedGallows", false);
      // setStatus("enhancedGibbet", false);
    }
  },
  gallows: {
    name: "Gallows",
    type: "weaponskill",
    cast: 0,
    shroud: 10,
    soulReaverCost: 1,
    potency: 460,
    enhancedPotency: 520,
    description: `Delivers an attack with a potency of 400. 
    460 when executed from a target's rear.
    <span class="green">Enhanced Gallows Potency:</span> 460
    <span class="green">Rear Enhanced Potency:</span> 520
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Enhanced Gibbet</span>
    <span class="green">Duration:</span> 60s
    The action <span class="orange">Blood Stalk</span> changes to <span class="orange">Unveiled Gibbet</span> while under the effect of <span class="yellow">Enhanced Gibbet</span>.
    <span class="green">Additional Effect:</span> Increases <span class="orange">Shroud Gauge</span> by 10
    Can only be executed while under the effect of <span class="yellow">Soul Reaver</span>.

    * Action changes to <span class="orange">Cross Reaping</span> while under the effect of <span class="yellow">Enshrouded</span>.`,
    useable(state) {
      return hasStatus("soulReaver");
    },
    transform(state) {
      return (hasStatus("enshrouded")) ? "crossReaping" : false;
    },
    highlight(state) {
      return hasStatus("soulReaver");
    },
    execute(state) {
      setStatus("enhancedGibbet", true);
      setStatus("soulReaver", false);
    }
  },
  unveiledGallows: {
    name: "Unveiled Gallows",
    type: "ability",
    cast: 0,
    recast: 1,
    soul: -50,
    comboPotency: 400,
    comboActions: ["gibbet"],
    soulReaver: 1,
    description: `Summon your avatar to deliver an attack with a potency of 400.
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Soul Reaver</span>
    <span class= "green">Duration:</span> 30s
    Stack count will be reduced to 1 when already under the effect of <span class="yellow">Soul Reaver</span>.
    <span class="green">Soul Gauge Cost:</span> 50
    Can only be executed while under the effect of <span class="yellow">Enhanced Gallows</span>.
    
    *This action cannot be assigned to a hotbar.`,
    transform(state) {
      return hasStatus("enshrouded") ? "lemuresSlice" : false;
    },
    useable(state) {
      //return this.combo(state);
      return (hasStatus("enhancedGallows") && state.gauge.soul >= 50);
    },
    highlight(state) {
      // return this.combo(state);
      return hasStatus("enhancedGallows");
    },
    execute(state) {
      setStatus("soulReaver", true);
      setStatus("enhancedGallows", false);
    }
    /*
    ,
    execute(state) {
      setStatus("soulReaver", true);
      setStatus("enhancedGibbet", false);
      state.enhancedGibbet = false;
    }
    */
  },
  gibbet: {
    name: "Gibbet",
    type: "weaponskill",
    cast: 0,
    shroud: 10,
    soulReaverCost: 1,
    potency: 460,
    enhancedPotency: 520,
    description: `Delivers an attack with a potency of 400.
    460 when executed from a target's flank.
    <span class="green">Enhanced Gibbet Potency:</span> 460
    <span class="green">Flank Enhanced Potency:</span> 520
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Enhanced Gallows</span>
    <span class="green">Duration:</span> 60s
    The action <span class="orange">Blood Stalk</span> changes to <span class="orange">Unveiled Gallows</span> while under the effect of <span class="yellow">Enhanced Gallows</span>.
    <span class="green">Additional Effect:</span> Increases <span class="orange">Shroud Gauge</span> by 10
    Can only be executed while under the effect of <span class="yellow">Soul Reaver</span>.
    
    *Action changes to <span class="orange">Void Reaping</span> while under the effect of <span class="yellow">Enshrouded</span>.`,
    useable(state) {
      return hasStatus("soulReaver");
    },
    transform(state) {
      return (hasStatus("enshrouded")) ? "voidReaping" : false;
    },highlight(state) {
      return hasStatus("soulReaver");
    },
    execute(state) {
      setStatus("enhancedGallows", true);
    }
  },
  unveiledGibbet: {
    name: "Unveiled Gibbet",
    type: "ability",
    cast: 0,
    recast: 1,
    soul: -50,
    comboPotency: 400,
    potency: 400,
    soulReaver: 1,
    comboActions: ["gallows"],
    description: `Summon your avatar to deliver an attack with a potency of 400.
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Soul Reaver</span>
    <span class="green">Duration:</span> 30s
    Stack count will be reduced to 1 when already under the effect of <span class="yellow">Soul Reaver</span>.
    <span class="green">Soul Gauge Cost:</span> 50
    Can only be executed while under the effect of <span class="yellow">Enhanced Gibbet</span>.

    * This action cannot be assigned to a hotbar.`,
    transform(state) {
      return hasStatus("enshrouded") ? "lemuresSlice" : false;
    },
    useable(state) {
      return (hasStatus("enhancedGibbet") && state.gauge.soul >= 50);
    },
    highlight(state) {
      return hasStatus("enhancedGibbet");
    },
    execute(state) {
      setStatus("soulReaver", true);
      setStatus("enhancedGibbet", false);
    }
  },
  enshroud: {
    name: "Enshroud",
    type: "ability",
    cast: 0,
    shroud: -50,
    recast: 15,
    description: `Offer your flesh as a vessel to your avatar, gaining maximum stacks of <span class="yellow">Lemure Shroud</span>
    <span class="green">Duration:</span> 30s
    Certain actions cannot be executed while playing host to your avatar.
    <span class="green">Shroud Gauge Cost:</span> 50`,
    useable(state) {
      return state.gauge.shroud >= 50;
    },
    execute(state) {
      setStatus("enshrouded", true);
      state.lemure.shroud = 5;
    }
  },
  voidReaping: {
    name: "Void Reaping",
    type: "weaponskill",
    cast: 0,
    lemureShroudCost: 1,
    recast: 1.5,
    potency: 460,
    enhancedPotency: 520,
    description: `Delivers an attack with a potency of 460.
    <span class="green">Enhanced Void Reaping Potency:</span> 520
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Enhanced Cross Reaping</span>
    Duration: 30s
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Void Shroud</span>
    Can only be executed while under the effect of <span class="yellow">Enshrouded</span>.
    Recast timer cannot be affected by status effects or gear attributes.
    <span class="green">Lemure Shroud Cost:</span> 1

    *This action cannot be assigned to a hotbar.`,
    execute(state) {
      setStatus("enhancedCrossReaping", true);
      setStatus("voidShroud", true);
      state.lemure.shroud--;
      state.lemure.voidShroud++;
    },
    highlight(state) {
      return hasStatus("enshrouded");
    },
    useable(state) {
      return state.lemure.shroud > 0;
    }
  },
  crossReaping: {
    name: "Cross Reaping",
    type: "weaponskill",
    cast: 0,
    recast: 1.5,
    potency: 460,
    enhancedPotency: 520,
    description: `Delivers an attack with a potency of 460.
    <span class="green">Enhanced Cross Reaping Potency:</span> 520
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Enhanced Void Reaping</span>
    <span class="green">Duration:</span> 30s
    <span class="green">Additional Effect:</span> Grants <span class="yellow">Void Shroud</span>
    Can only be executed while under the effect of <span class="yellow">Lemure Shroud</span>.
    Recast timer cannot be affected by status effects or gear attributes
    <span class="green">Lemure Shroud Cost:</span> 1

    *This action cannot be assigned to a hotbar.`,
    execute(state) {
      setStatus("enhancedVoidReaping", true);
      setStatus("voidShroud", true);
      state.lemure.shroud--;
      state.lemure.voidShroud++;
    },
    highlight(state) {
      return hasStatus("enshrouded");
    },
    useable(state) {
      return state.lemure.shroud > 0;
    }
  },
  lemuresSlice: {
    name: "Lemure's Slice",
    type: "ability",
    cast: 0,
    recast: 1,
    potency: 200,
    description: `Delivers an attack with a potency of 200.
    <span class="green">Void Shroud Cost: 2

    *This action cannot be assigned to a hotbar.`,
    highlight(state) {
      return hasStatus("enshrouded");
    },
    useable(state) {
      return state.lemure.voidShroud >= 2;
    },
    execute(state) {
      state.lemure.voidShroud -= 2;
    }
  },
  communio: {
    name: "Communio",
    type: "spell",
    cast: 1.3,
    potency: 1000,
    description: `Deals unaspected damage to target and all enemies nearby it with a potency of 1,000 for the first enemy, and 60% less for all remaining enemies. 
    <span class="yellow">Enshrouded</span> effect expires upon execution. Requires at least one stack of <span class="yellow">Lemure Shroud</span> to execute.`,
    execute(state) {
      setStatus("enshrouded", false);
      state.lemure.shroud = 0;
      state.lemure.voidShroud = 0;
    },
    useable(state) {
      return (hasStatus("enshrouded") && state.lemure.shroud > 0);
    }
  },

  jolt2: {
    name: "Jolt II",
    type: "spell",
    potency: 240,
    mana: 3,
    black: 3,
    white: 3,
    description: `Deals unaspected damage with a potency of 240.
    <span class="green">Additional Effect:</span> Grants Impactful
    <span class="green">Additional Effect:</span> Increases both <span class="yellow">Black Mana</span> and <span class="yellow">White Mana</span> by 3.`,
    execute(state) {
      setStatus('impact', true);
    }
  },
  impact: {
    name: "Impact",
    type: "spell",
    potency: 270,
    mana: 3,
    white: 4,
    black: 4,
    description: `Deals unaspected damage with a potency of 270.
    <span class="green">Additional Effect:</span> Increases both <span class="yellow">Black Mana</span> and <span class="yellow">White Mana</span> by 4.
    Can only be executed while under the effects of <span class="yellow">Impactful</span>.`,
    execute(state) {
      setStatus('impact', false);
    },
    useable(state) {
      return hasStatus("impact");
    },
    highlight(state) {
      return this.useable(state);
    }
  },
  verthunder: {
    name: "Verthunder",
    type: "spell",
    cast: 5,
    potency: 300,
    mana: 4,
    black: 11,
    description: `Deals thunder damage with a potency of 300.
    <span class="green">Additional Effect:</span> 50% chance of becoming <span class="yellow">Verfire Ready</span>.
    <span class="green">Additional Effect:</span> Increases <span class="yellow">Black Mana</span> by 11.`,
    execute(state) {
      if(Math.random() > 0.5 || hasStatus("acceleration"))
        setStatus('verfire', true);
      setStatus('acceleration', false);
    }
  },
  veraero: {
    name: "Veraero",
    type: "spell",
    cast: 5,
    potency: 300,
    mana: 4,
    white: 11,
    description: `Deals wind damage with a potency of 300.
    <span class="green">Additional Effect:</span> 50% chance of becoming <span class="yellow">Verstone Ready</span>.
    <span class="green">Additional Effect:</span> Increases <span class="yellow">White Mana</span> by 11.`,
    execute(state) {
      if(Math.random() > 0.5 || hasStatus("acceleration"))
        setStatus('verstone', true);
      setStatus('acceleration', false);
    }
  },
  verfire: {
    name: "Verfire",
    type: "spell",
    cast: 2,
    potency: 270,
    mana: 3,
    black: 9,
    description: `Deals fire damage with a potency of 270.
    <span class="green">Additional Effect:</span> Increases <span class="yellow">Black Mana</span> by 9.
    Can only be executed while <span class="yellow">Verfire Ready</span>.`,
    execute(state) {
      setStatus('verfire', false);
    },
    useable(state) {
      return hasStatus("verfire");
    },
    highlight(state) {
      return this.useable();
    }
  },
  verstone: {
    name: "Verstone",
    type: "spell",
    cast: 2,
    potency: 270,
    mana: 3,
    white: 9,
    description: `Deals earth damage with a potency of 270.
    <span class="green">Additional Effect:</span> Increases <span class="yellow">White Mana</span> by 9.
    Can only be executed while <span class="yellow">Verstone Ready</span>.`,
    execute(state) {
      setStatus('verstone', false);
    },
    useable(state) {
      return hasStatus("verstone");
    },
    highlight(state) {
      return this.useable();
    }
  },
  vercure: {
    name: "Vercure",
    type: "spell",
    cast: 2,
    mana: 5,
    white: 0,
    description: `Restores target HP.
    <span class="green">Cure potency:</span> 350`,
  },
  verflare: {
    name: "Verflare",
    type: "spell",
    cast: 0,
    comboPotency: 550,
    comboActions: ["enchanted_redoublement"],
    mana: 5,
    black: 21,
    description: `Deals fire damage with a potency of 550.
    <span class="green">Combo Action:</span> <span class="orange">Enchanted Redoublement</span>
    <span class="green">Additional Effect:</span> Increases <span class="yellow">Black Mana</span> by 21
    <span class="green">Additional Effect:</span> 20% chance of becoming <span class="yellow">Verfire Ready</span>.
    Chance to become <span class="yellow">Verfire Ready</span> increases to 100% if <span class="yellow">White Mana</span> is higher than <span class="yellow">Black Mana</span> at time of execution.`,
    execute(state) {
      if(Math.random() < 0.2 || state.gauge.white > state.gauge.black)
        setStatus('verfire', true);
    },
    useable(state) {
      return this.combo(state);
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  verholy: {
    name: "Verholy",
    type: "spell",
    cast: 0,
    comboPotency: 550,
    comboActions: ["enchanted_redoublement"],
    mana: 5,
    white: 21,
    description: `Deals unaspected damage with a potency of 550.
    <span class="green">Combo Action:</span> <span class="orange">Enchanted Redoublement</span>
    <span class="green">Additional Effect:</span> Increases <span class="yellow">White Mana</span> by 21
    <span class="green">Additional Effect:</span> 20% chance of becoming <span class="yellow">Verstone Ready</span>.
    Chance to become <span class="yellow">Verstone Ready</span> increases to 100% if <span class="yellow">Black Mana</span> is higher than <span class="yellow">White Mana</span> at time of execution.`,
    execute(state) {
      if(Math.random() < 0.2 || state.gauge.black > state.gauge.white)
        setStatus('verstone', true);
    },
    useable(state) {
      return this.combo(state);
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  corps_a_corps: {
    name: "Corps-a-corps",
    type: "ability",
    cast: 0,
    recast: 40,
    potency: 130,
    description: `Rushes towards target and deals unaspected damage with a potency of 130.`,
    execute(state) {
      setMelee(true);
    }
  },
  displacement: {
    name: "Displacement",
    type: "ability",
    cast: 0,
    recast: 35,
    potency: 130,
    melee: true,
    description: `Delivers an attack with a potency of 130.
    <span class="green">Additional Effect:</span> 10-yalm backstep`,
    useable(state) {
      return state.melee;
    },
    execute(state) {
      setMelee(false);
    }
  },
  acceleration: {
    name: "Acceleration",
    type: "ability",
    cast: 0,
    recast: 35,
    description: `Ensures that the next <span class="orange">Verthunder</span> or <span class="orange">Veraero</span> spell cast will, for the first hit, trigger <span class="yellow">Verfire Ready</span> or <span class="yellow">Verstone Ready</span> respectively.
    <span class="green">Duration:</span> 10s`,
    execute(state) {
      setStatus("acceleration", true);
    }
  },
  manafication: {
    name: "Manafication",
    type: "ability",
    cast: 0,
    recast: 120,
    description: `Doubles current <span class="yellow">Black Mana</span> and <span class="yellow">White Mana</span> values.
    <span class="green">Additional Effect:</span> Resets <span class="orange">Corps-a-corps</span> and <span class="orange">Displacement</span> recast timers.`,
    execute(state) {
      state.gauge.black = Math.min(100, state.gauge.black * 2);
      state.gauge.white = Math.min(100, state.gauge.white * 2);
      clearRecast("corps_a_corps");
      clearRecast("displacement");
      state.lastAction = "";
    }
  },
  embolden: {
    name: "Embolden",
    type: "ability",
    cast: 0,
    recast: 120,
    description: `Increases own magic damage delt by 10% and physical damage delt by nearby party members by 10%. Both effects are reduced by 20% every 4s.
    <span class="green">Duration:</span> 20s`,
    execute(state) {
      function lower() {
        state.emboldenDamage -= 0.02;
        if(state.emboldenDamage > 0) {
          addTimer(lower, 4000);
        } else {
          state.emboldenDamage = 0;
        }
        $("[data-status=\"embolden\"] img").prop("src", `img/status/embolden${Math.floor(state.emboldenDamage / 0.02) + 1}.png`)
      }

      state.emboldenDamage = 0.12;
      lower();
      setStatus("embolden", true);
    }
  },
  swiftcast: {
    name: "Swiftcast",
    type: "ability",
    cast: 0,
    recast: 60,
    description: `Next spell is cast immediately.`,
    execute(state) {
      setStatus("swiftcast", true);
    }
  },
  lucid_dreaming: {
    name: "Lucid Dreaming",
    type: "ability",
    cast: 0,
    recast: 120,
    description: `Reduces enmity by half.
    <span class="green">Additional Effect:</span> Refresh
    <span class="green">Refresh Potency:</span> 80
    <span class="green">Duration:</span> 21s`,
    execute(state) {
      setStatus("lucid_dreaming", true);
    }
  },
  fleche: {
    name: "Fleche",
    type: "ability",
    cast: 0,
    recast: 25,
    potency: 420,
    description: "Deals unaspected damage with a potency of 420."
  },
  contre_sixte: {
    name: "Contre Sixte",
    type: "ability",
    cast: 0,
    recast: 45,
    potency: 300,
    description: "Delivers an attack to all nearby enemies with a potency of 300 for the first enemy, 10% less for the second, 20% less for the third, 30% less for the fourth, 40% less for the fifth, and 50% less for all remaining enemies."
  },

  riposte: {
    name: "Riposte",
    type: "weaponskill",
    cast: 0,
    recast: 2.5,
    potency: 130,
    melee: true,
    description: `Delivers an attack with a potency of 130.
    Action upgraded to <span class="orange">Enchanted Riposte</span> if both <span class="orange">Black Mana</span> and <span class="orange">White Mana</span> are 30 or above.`,
    execute(state) {
      setMelee(true);
    },
    useable(state) {
      return state.melee || getSetting("rangedmelee");
    },
    transform(state) {
      return (state.gauge.black >= 30 && state.gauge.white >= 30) ? "enchanted_riposte" : false;
    }
  },
  enchanted_riposte: {
    name: "Enchanted Riposte",
    type: "weaponskill",
    cast: 0,
    recast: 1.5,
    potency: 210,
    white: -30,
    black: -30,
    melee: true,
    description: `Deals unaspected dmage with a potency of 210.
    <span class="green">Balance Gauge Cost:</span> 30 <span class="orange">Black Mana</span>
    <span class="green">Balance Gauge Cost:</span> 30 <span class="orange">White Mana</span>`,
    execute(state) {
      setMelee(true);
    },
    useable(state) {
      return state.melee || getSetting("rangedmelee");
    },
  },
  zwerchhau: {
    name: "Zwerchhau",
    type: "weaponskill",
    cast: 0,
    recast: 2.5,
    potency: 100,
    comboPotency: 150,
    comboActions: ["riposte", "enchanted_riposte"],
    melee: true,
    description: `Delivers an attack with a potency of 100.
    <span class="green">Combo Action:</span> <span class="orange">Riposte</span> or <span class="orange">Enchanted Riposte</span>
    <span class="green">Combo Potency:</span> 150
    Action upgraded to <span class="orange">Enchanted Zwerchhau</span> if both <span class="orange">Black Mana</span> and <span class="orange">White Mana</span> are 25 or above.`,
    execute(state) {
      setMelee(true);
    },
    useable(state) {
      return state.melee || getSetting("rangedmelee");
    },
    transform(state) {
      return (state.gauge.black >= 25 && state.gauge.white >= 25) ? "enchanted_zwerchhau" : false;
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  enchanted_zwerchhau: {
    name: "Enchanted Zwerchhau",
    type: "weaponskill",
    cast: 0,
    recast: 1.5,
    potency: 100,
    comboPotency: 290,
    comboActions: ["riposte", "enchanted_riposte"],
    white: -25,
    black: -25,
    melee: true,
    description: `Deals unaspected damage with a potency of 100.
    <span class="green">Combo Action:</span> <span class="orange">Riposte</span> or <span class="orange">Enchanted Riposte</span>
    <span class="green">Combo Potency:</span> 290
    <span class="green">Balance Gauge Cost:</span> 25 <span class="orange">Black Mana</span>
    <span class="green">Balance Gauge Cost:</span> 25 <span class="orange">White Mana</span>`,
    execute(state) {
      setMelee(true);
    },
    useable(state) {
      return state.melee || getSetting("rangedmelee");
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  redoublement: {
    name: "Redoublement",
    type: "weaponskill",
    cast: 0,
    recast: 2.5,
    potency: 100,
    comboPotency: 230,
    comboActions: ["zwerchhau", "enchanted_zwerchhau"],
    melee: true,
    description: `Delivers an attack with a potency of 100.
    <span class="green">Combo Action:</span> <span class="orange">Zwerchhau</span> or <span class="orange">Enchanted Zwerchhau</span>
    <span class="green">Combo Potency:</span> 230
    Action upgraded to <span class="orange">Enchanted Redoublement</span> if both <span class="orange">Black Mana</span> and <span class="orange">White Mana</span> are 25 or above.`,
    execute(state) {
      setMelee(true);
    },
    useable(state) {
      return state.melee || getSetting("rangedmelee");
    },
    transform(state) {
      return (state.gauge.black >= 25 && state.gauge.white >= 25) ? "enchanted_redoublement" : false;
    },
    highlight(state) {
      return this.combo(state);
    }
  },
  enchanted_redoublement: {
    name: "Enchanted Redoublement",
    type: "weaponskill",
    cast: 0,
    recast: 2.2,
    potency: 100,
    comboPotency: 470,
    comboActions: ["zwerchhau", "enchanted_zwerchhau"],
    white: -25,
    black: -25,
    melee: true,
    description: `Deals unaspected damage with a potency of 100.
    <span class="green">Combo Action:</span> <span class="orange">Zwerchhau</span> or <span class="orange">Enchanted Zwerchhau</span>
    <span class="green">Combo Potency:</span> 470
    <span class="green">Balance Gauge Cost:</span> 25 <span class="orange">Black Mana</span>
    <span class="green">Balance Gauge Cost:</span> 25 <span class="orange">White Mana</span>`,
    execute(state) {
      setMelee(true);
    },
    useable(state) {
      return state.melee || getSetting("rangedmelee");
    },
    highlight(state) {
      return this.combo(state);
    }
  }
};

const statuses = {
  dualcast: {
    name: "Dualcast",
    duration: 15,
    description: "Next spell is cast immediately."
  },
  impact: {
    name: "Impactful",
    duration: 30,
    description: "Impact is usable."
  },
  verfire: {
    name: "Verfire Ready",
    duration: 30,
    description: "Verfire is usable."
  },
  verstone: {
    name: "Verstone Ready",
    duration: 30,
    description: "Verstone is usable."
  },
  swiftcast: {
    name: "Swiftcast",
    duration: 10,
    description: "Next spell is cast immediately."
  },
  embolden: {
    name: "Embolden V",
    duration: 20,
    description: "Magic damage is increased."
  },
  acceleration: {
    name: "Acceleration",
    duration: 10,
    description: "Next Veraero or Verthunder will grant Verstone Ready or Verfire Ready, respectively."
  },
  lucid_dreaming:  {
    name: "Lucid Dreaming",
    duration: 21,
    description: "Gradually restoring MP over time."
  },

  enhancedGallows: {
    name: "Enhanced Gallows",
    duration: 60,
    description: "Changes Bloodstalk into Unveiled Gallows; increases potency of the next Gallows."
  },
  enhancedGibbet: {
    name: "Enhanced Gibbet",
    duration: 60,
    description: "Changes Bloodstalk into Unveiled Gibbet; increases potency of the next Gibbet."
  },
  soulReaver: {
    name: "Soul Reaver",
    duration: 30,
    stack: 0,
    description: "Allows use of Gallows and Gibbet."
  },
  enhancedCrossReaping: {
    name: "Enhanced Cross Reaping",
    duration: 30,
    description: "Enhances the potency of the next Cross Reaping."
  },
  enhancedVoidReaping: {
    name: "Enhanced Void Reaping",
    duration: 30,
    description: "Enhances the potency of the next Void Reaping."
  },
  voidShroud: {
    name: "Void Shroud",
    duration: 30,
    description: "Allows the execution of Lemure's Slice and Lemure's Scythe."
  },
  soulSow: {
    name: "Soul Sow",
    duration: 1000000,
    description: "Allows the execution of Harvest Moon."
  },
  arcaneCircle: {
    name: "Arcane Circle",
    duration: 20,
    description: "Increases damage by 3%."
  },
  circleOfSacrifice: {
    name: "Circle of Sacrifice",
    duration: 5,
    description: ""
  },
  bloodswornCircle: {
    name: "Bloodsworn Circle",
    duration: 6,
    description: ""
  },
  enshrouded: {
    name: "Enshrouded",
    duration: 30,
    description: "In Lemure Shroud form."
  }
};

var keyCodes = {
  3 : "",
  8 : "",
  9 : "TAB",
  12 : '',
  13 : "",
  16 : "",
  17 : "",
  18 : "",
  19 : "P",
  20 : "CAPS",
  27 : "ESC",
  32 : "",
  33 : "PUP",
  34 : "PDN",
  35 : "END",
  36 : "HOME",
  37 : "",
  38 : "",
  39 : "",
  40 : "",
  41 : "",
  42 : "",
  43 : "",
  44 : "",
  45 : "INS",
  46 : "DEL",
  48 : "0",
  49 : "1",
  50 : "2",
  51 : "3",
  52 : "4",
  53 : "5",
  54 : "6",
  55 : "7",
  56 : "8",
  57 : "9",
  58 : ":",
  59 : "",
  60 : "<",
  61 : "",
  63 : "ß",
  64 : "@",
  65 : "A",
  66 : "B",
  67 : "C",
  68 : "D",
  69 : "E",
  70 : "F",
  71 : "G",
  72 : "H",
  73 : "I",
  74 : "J",
  75 : "K",
  76 : "L",
  77 : "M",
  78 : "N",
  79 : "O",
  80 : "P",
  81 : "Q",
  82 : "R",
  83 : "S",
  84 : "T",
  85 : "U",
  86 : "V",
  87 : "W",
  88 : "X",
  89 : "Y",
  90 : "Z",
  91 : "WIN",
  92 : "WIN",
  93 : "WIN",
  96 : "N0",
  97 : "N1",
  98 : "N2",
  99 : "N3",
  100 : "N4",
  101 : "N5",
  102 : "N6",
  103 : "N7",
  104 : "N8",
  105 : "N9",
  106 : "N*",
  107 : "N+",
  108 : "N.",
  109 : "N-",
  110 : "N.",
  111 : "N/",
  112 : "F1",
  113 : "F2",
  114 : "F3",
  115 : "F4",
  116 : "F5",
  117 : "F6",
  118 : "F7",
  119 : "F8",
  120 : "F9",
  121 : "F10",
  122 : "F11",
  123 : "F12",
  124 : "F13",
  125 : "F14",
  126 : "F15",
  127 : "F16",
  128 : "F17",
  129 : "F18",
  130 : "F19",
  131 : "F20",
  132 : "F21",
  133 : "F22",
  134 : "F23",
  135 : "F24",
  144 : "NUM",
  145 : "SCRL",
  160 : "^",
  161: '!',
  163 : "#",
  164: '$',
  165: 'ù',
  166 : "",
  167 : "",
  169 : "",
  170: '*',
  171 : "",
  173 : "",
  174 : "",
  175 : "",
  176 : "",
  177 : "",
  178 : "",
  179 : "",
  180 : "",
  181 : "",
  182 : "",
  183 : "",
  186 : ";",
  187 : "=",
  188 : ",",
  189 : "-",
  190 : ".",
  191 : "/",
  192 : "`",
  193 : "?",
  194 : "N.",
  219 : "[",
  220 : "\\",
  221 : "]",
  222 : "'",
  223 : "`",
  224 : "",
  225 : "altgr",
  226 : "",
  230 : "",
  231 : "ç",
  233 : "",
  234 : "",
  255 : ""
};

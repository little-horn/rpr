var state = {
  cast: { action: "", start: 0, end: 0 },
  recast: {},
  lastAction: "",
  lastCombo: false,
  gauge: { black: 0, white: 0, soul: 0, shroud: 0 },
  statuses: {},
  statusTimers: {},
  melee: false,
  potency: 0,
  damage: 0,
  damageStart: -1,
  emboldenDamage: 0,
  animStart: 0,
  hotkeyMode: false,
  hotkeySkill: "",
  hotkeys: {},
  mana: 14400,
  maxMana: 14400,

  maxSoul: 100,
  lemure: {
    shroud: 0,
    voidShroud: 0
  },
  voidShroud: 0,
  soulReaver: 0,
  maxShroud: 100,
  arcaneCircleDamage: 0,
  soulSliceCharge: 2,

  currentTime: 0,
  targetTime: 0,
  timers: [],
  setting: [],
  statusStack: 0,
  queueAction: "",
  queueTime: 0
};

function preCache(src) {
  var img = new Image();
  img.src = src;
}

preCache("img/visualisation/Red_mage1.png");
preCache("img/visualisation/Red_mage2.png");

// Attempts to use an action by id
function useAction(name) {
  if(!actionUsable(name)) {
    state.queueAction = name;
    state.queueTime = state.currentTime;
    return;
  }

  const action = getAction(name);
  if(!action) return;

  const castTime = (hasStatus("dualcast") || hasStatus("swiftcast")) ? 0 : action.cast; // insta-cast?

  // are we casting a spell or using an ability
  if(action.type != "ability") {
    // remove dualcast/swiftcast status, priority being swiftcast
    if(hasStatus("swiftcast") && action.type == "spell") {
      setStatus("swiftcast", false);
    } else {
      setStatus("dualcast", false);
    }

    // Set the cast/resast state for both error checking and UI
    state.cast.action = action.id;
    state.cast.start = state.currentTime;
    state.cast.end = state.cast.start + castTime * 1000;

    // set the target time, the timer will only advance time to this point
    // it's set to what ever the longest lock is, cast, recast or anim lock (or the old target time)
    var delay = Math.max(castTime, action.recast, action.animationLock) * 1000;
    state.targetTime = state.currentTime + Math.max(delay + 10, state.targetTime - state.currentTime);
  } else {
    // using an ability is a lot simpler, advance target time by animation lock
    state.targetTime = state.currentTime + Math.max(action.animationLock * 1000 + 10, state.targetTime - state.currentTime);
  }

  // put the action on cooldown
  addRecast(action.recastGroup(), action.recast * 1000);

  state.animationLock = state.currentTime + action.animationLock * 1000;

  // Update UI
  updateActions(); // now
  addTimer(updateActions, action.recast * 1000); // when GCD finishes
  addTimer(updateActions, action.animationLock * 1000); // when animation lock finishes
  addTimer(updateActions, 8000); // when combo breaks

  // when the cast finishes, resolve the action
  addTimer(() => {
    action.execute(state); // execute action-specific stuff

    // get how much black and white mana to add to gauge
    var white = action.white > 0 && state.gauge.black >= state.gauge.white + 30 ? Math.floor(action.white / 2) : action.white;
    var black = action.black > 0 && state.gauge.white >= state.gauge.black + 30 ? Math.floor(action.black / 2) : action.black;

    // var soul = action.soul > 0 ? action.soul : 0;
    // var shroud = action.shroud > 0 ? action.shroud : 0;

    var soul = action.soul == null ? 0 : action.soul;
    var shroud = action.shroud == null ? 0 : action.shroud;

    // start DPS timer if we did damage
    var potency = action.calculatePotency(state);
    if(state.damageStart == -1 && potency > 0) {
      state.damageStart = state.currentTime;
    }

    // update DPS
    let damage = Math.floor(potency / 100 * 1817);
    damage = Math.floor(damage * (1 + state.emboldenDamage));
    damage = Math.floor(damage * (Math.random() * 0.1 + 0.95));

    damage = Math.floor(damage * (1 + state.arcaneCircleDamage));
    damage = Math.floor(damage * (Math.random() * 0.1 + 0.95));

    state.potency += potency * (1 + state.emboldenDamage);
    state.potency += potency * (1 + state.arcaneCircleDamage);
    state.damage += damage;

    if(damage > 0) {
      var damageNode = $(`<span class="damage-text">${Math.floor(damage)}</span>`);
      damageNode.css({
        left: Math.floor(Math.random() * 100) + 120,
      });
      damageNode.appendTo(".visualisation");
      setTimeout(() => {
        damageNode.remove();
      }, 1300);
    }

    // // give dualcast if we casted a thing
    // if(action.type == "spell" && castTime > 0) {
    //   setStatus('dualcast', true);
    // }

    // last non-ability action used, for combos
    if(action.type != "ability") {
      state.lastActionTime = state.currentTime;
      state.lastCombo = action.combo(state);
      state.lastAction = action.id;
    }

    // update UI
    $(".rdm").prop("src", "img/visualisation/Red_mage.png");
    setMana(state.mana - calculateManaCost(action.mana));
    setGauge(state.gauge.black + black, state.gauge.white + white);
    setSoulGauge(state.gauge.soul + soul);
    setShroudGauge(state.gauge.shroud + shroud);
    updateActions();
  }, castTime * 1000);
}

// The global animation timer
// Handles the advancing of time, any animations, and firing timer events
var lastFrame = Date.now();
function timer() {
  // advance time from last frame
  state.currentTime += Date.now() - lastFrame;
  lastFrame = Date.now();

  // cap time to the target if not realtime
  if(!getSetting("realtime", true)) {
    state.currentTime = Math.min(state.targetTime, state.currentTime);
  }

  // are we casting/on gcd consts
  const casting = state.currentTime < state.cast.end;
  const globalCooldown = !!getRecast("global");

  // show/hide cast bar
  $('.casting').toggle(casting);

  // update casting ui
  if(casting) {
    var castPercent = (state.currentTime - state.cast.start) / (state.cast.end - state.cast.start);
    var action = getAction(state.cast.action);
    $(".cast").text(`${((state.cast.end - state.currentTime) / 1000).toFixed(2)}s`);
    $(".casting .icon").prop("src", `img/${action.id}.png`);
    $(".casting .name").text(action.name);
    $(".casting .progress-bar").css({
      width: `${castPercent * 100}%`
    });

    var frame = Math.floor((state.currentTime - state.cast.start) / 300) % 2;
    $(".rdm").prop("src", `img/visualisation/Red_mage${frame + 1}.png`);
  }

  // handle timers
  state.timers.forEach((obj, i) => {
    if(obj == null) return;
    if(state.currentTime >= obj.time) {
      obj.fn();
      if(obj.repeating) {
        obj.time = state.currentTime + obj.delay;
      } else {
        removeTimer(i);
      }
    }
  });

  // Handle action queue
  if(state.queueTime + 500 >= state.currentTime && actionUsable(state.queueAction)) {
    useAction(state.queueAction);
    state.queueAction = "";
    state.queueTime = 0;
  }

  return requestAnimationFrame(timer);
}

// Update DPS/PPS every 0.5s
setInterval(() => {
  if(state.damageStart > 0) {
    $(".dps").text((state.damage / ((state.currentTime - state.damageStart) / 1000)).toFixed(2));
    $(".pps").text((state.potency / ((state.currentTime - state.damageStart) / 1000)).toFixed(2));
  }
}, 500);

// Update action cooldown numbers every 0.1s
setInterval(() => {
  var now = state.currentTime;
  var gcd = state.recast.end - state.currentTime;

  $(".actions .action").each(function() {
    const key = $(this).data("action");
    const action = getAction(key);
    var label = $(".cooldown", this)

    var value = getRecast(action.recastGroup()) / 1000;
    if(!!value) {
      if(value > 10) {
        label.text(`${Math.floor(value)}s`);
      } else {
        label.text(`${value.toFixed(1)}s`);
      }
    } else {
      label.text(``);
    }
  });

  if(state.damageStart != -1) {
    $(".time").text(`${((state.currentTime - state.damageStart) / 1000).toFixed(1)}s`)
  }
}, 100);

// 3s server tick timer
addTimer(() => {
  setMana(state.mana + Math.floor(state.maxMana * 0.02));
  if(hasStatus("lucid_dreaming")) {
    setMana(state.mana + (80 * 12));
  }
  updateActions();
}, 3000, true);

loadSetting("realtime", true, "boolean");
loadSetting("visualise", true, "boolean", function(value) {
  $(".visualisation-wrapper").toggleClass("hidden", !value);
});
loadSetting("rangedmelee", false, "boolean", function() {
  updateActions();
});
loadSetting("gcd", 2.5, "number", function(value) {
  updateActions();
  $(".gcdtime").text(value.toFixed(2));
});
loadSetting("tooltips", true, "boolean", function(value) {
  if(!value) {
    return $("body").tooltip("dispose");
  }

  $("body").tooltip({
    selector: "[data-action]",
    html: true,
    title() {
      const action = getAction($(this).data("action"));
      var tooltip = "";
      if(action.type == "ability") {
        tooltip = `
          <strong><u>${action.name}</u></strong> (${action.type})
          <strong>Recast:</strong> ${action.recast.toFixed(2) + "s"}

          ${action.description}`;
      } else {
        tooltip =`
          <strong><u>${action.name}</u></strong> (${action.type})
          <strong>Cast:</strong> ${action.cast == 0 ? "Instant" : action.cast.toFixed(2) + "s"}  <strong>Recast:</strong> ${action.recast.toFixed(2)}s ${action.type === "weaponskill" ? "" : "<br><strong>Mana Cost:</strong> " + calculateManaCost(action.mana)}

          ${action.description}`;
      }
      return tooltip.trim().replace(/\n/g, "<br />").replace(/^\s+/mg, "");
    }
  });
});

loadHotkeys(); // load hotkeys
setGauge(0, 0); // reset state
setShroudGauge(0);
setSoulGauge(0);
setMana(14400);
updateActions();

requestAnimationFrame(timer); // start the animation-handling timer

// Clicking on action buttons uses them (or sets them as the active skill in hotkey mode)
$(".actions .action").click(function(e) {
  var name = $(this).data("action");
  if(state.hotkeyMode) {
    $(".action.selected").removeClass("selected");
    $(this).addClass("selected");
    state.hotkeySkill = name;
  } else {
    useAction(name);
  }
});

$(".actions .action").contextmenu(function(e) {
  if(state.hotkeyMode) {
    var name = $(this).data("action");
    clearHotkey(name);
    e.preventDefault();
  }
});

// Reset button reloads page because resetting state is hard
$("#potreset").click(function(e) {
  window.history.go(0);
});

// Hotkey mode button
$("#hotkey").click(function(e) {
  state.hotkeyMode = $(this).is(":checked");
  $(".container").toggleClass("hotkey-mode", state.hotkeyMode);
  $(".action.selected").removeClass("selected");
  state.hotkeySkill = "";
  updateActions();
});

// Settings
$("[data-setting]").change(function(e) {
  var setting = $(this).data("setting");
  switch(getSettingType(setting)) {
    case "boolean":
      setSetting(setting, $(this).is(":checked")); break;
    case "number":
      setSetting(setting, parseFloat($(this).val())); break;
    case "string":
      setSetting(setting, $(this).val()); break;
  }
});

// Hotkey handler
$(document).keydown(function(e) {
  // block shift, alt and ctrl
  if([16, 17, 18].includes(e.which))
    return true;

  // block when modal is open
  if($('#settings').is(':visible'))
    return true;

  // esc - cancel cast
  if(which == 27) {
    // todo
  }

  var which = e.which.toString();
  if(e.originalEvent.getModifierState("Alt")) which += "a";
  if(e.originalEvent.getModifierState("Shift")) which += "s";
  if(e.originalEvent.getModifierState("Control")) which += "c";

  if(state.hotkeyMode && state.hotkeySkill != "") {
    setHotkey(state.hotkeySkill, which);
    e.preventDefault();
  } else {
    var name = state.hotkeys[which];
    if(name) {
      useAction(name);
      e.preventDefault();
    }
  }
});

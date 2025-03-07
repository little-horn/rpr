// add an (optionally, repeating) timer
function addTimer(fn, delay, repeating) {
  return state.timers.push({
    fn,
    time: state.currentTime + delay,
    delay,
    repeating: !!repeating
  }) - 1;
}

// remove a once-off timer before it fires
function removeTimer(id) {
  if(typeof state.timers[id] == "object")
    state.timers[id] = null;
}

function setMelee(active) {
  state.melee = active;
  $(".rdm").toggleClass("melee", active);
}

// Calculate mana cost from base value
function calculateManaCost(cost) {
  const scalingFactor = 12000;
  return Math.floor(cost * scalingFactor / 100);
}

// sets the current mana and updates UI
function setMana(mana) {
  state.mana = Math.min(mana, state.maxMana);
  $(".progress-mana .progress-bar").css({
    width: `${state.mana/state.maxMana*100}%`
  });
  $(".mana").text(`${state.mana} / ${state.maxMana}`);
}

// gets an action's information by name, handling any transforms
function getAction(name) {
  if(typeof actions[name] === "undefined")
    return false;

  var action = Object.assign({ id: name }, defaultAction, actions[name]);
  var transform = action.transform(state);
  if(transform != false) {
    return getAction(transform);
  }

  if(action.type == "spell") {
    var scale = getSetting("gcd", 2.5) / 2.5;
    action.cast *= scale;
    action.recast *= scale;
  }

  return action;
}

// is a status active?
function hasStatus(name) {
  return state.statuses[name] > 0; // has to handle undefined
}

function addRecast(name, duration) {
  state.recast[name] = {
    start: state.currentTime,
    duration: duration
  };
}

function setRecast(name, duration) {
  if(!getRecast(name)) {
    return addRecast(name, duration);
  }

  state.recast[name].duration = duration;
}

function getRecast(name) {
  if(state.recast[name] == undefined)
    return 0;

  var recast = state.recast[name];
  return Math.max(0, (recast.start + recast.duration) - state.currentTime);
}

function clearRecast(name) {
  delete state.recast[name];
}

function floatStatus(name, added) {
  return true; // todo lol
  const status = statuses[name];

  // Move all the existing ones up
  $(".visualisation .status-text").each(function() {
    console.log(this);
    $(this).css("top", "-=28");
  });

  var statusNode = $(`<span class="status-text ${added ? "status-added" : "status-removed"}"><img src="img/status/${name}.png" /> ${added ? "+" : "-"} ${status.name}</span>`);
  statusNode.css({
    left: state.melee ? 240 : 570,
    top: 100
  });
  statusNode.appendTo(".visualisation");
  setTimeout(() => {
    statusNode.remove();
  }, 2500);
}

// sets a status as active/inactive
function setStatus(name, active) {
  var status = statuses[name];

  // add, or remove it?
  if(active) {
    // if we have the status already, just update it
    if(!hasStatus(name)) {
      var el = $(`<div class="status" data-status="${name}" title="${status.description}"><img src="img/status/${name}.png"<br /><small>${status.duration}s</small></span>`);
      el.appendTo('.statuses');
    } else {
      var el = $(`.status[data-status="${name}"]`);
      removeTimer(state.statusTimers[name]);
    }

    // status countdown timer
    state.statuses[name] = status.duration;
    state.statusTimers[name] = addTimer(() => {
      state.statuses[name]--;
      if(state.statuses[name] <= 0) {
         setStatus(name, false);
      } else {
        // update ui
        $("small", el).text(`${state.statuses[name]}s`);
      }
    }, 1000, true);

    // Floating status text
    floatStatus(name, true);

    updateActions();
  } else {
    if(state.statuses[name] > 0) {
      floatStatus(name, false);
    }

    // removing an action removes the timer and ui element
    removeTimer(state.statusTimers[name]);
    delete state.statuses[name];
    delete state.statusTimers[name];
    $(`.status[data-status="${name}"]`).remove();

    updateActions();
  }
}

// Checks if an action is usable
function actionUsable(key) {
  const action = getAction(key);
  if(!action)
    return false;

  // trying to use an action while it's on cooldown
  if(!!getRecast(action.recastGroup()))
    return false;

  // can't use stuff while casting
  if(state.currentTime < state.cast.end)
    return false;

  // can't use anything while animation locked
  if(state.currentTime < state.animationLock)
    return false;

  // not enough mana
  if(calculateManaCost(action.mana) > state.mana)
    return false;

  // check action specific stuff
  return action.useable(state);
}

// Sets black/white mana gauge and updates UI
function setGauge(black, white) {
  state.gauge.black = Math.max(0, Math.min(100, black));
  state.gauge.white = Math.max(0, Math.min(100, white));

  $(".gauge").text(`White ${state.gauge.white} / Black ${state.gauge.black}`);
  $(".bg-black").css({
    width: `${state.gauge.black}%`
  })
  $(".bg-black").text(state.gauge.black);
  $(".bg-white").css({
    width: `${state.gauge.white}%`
  })
  $(".bg-white").text(state.gauge.white);

  $(".progress-gauge").toggleClass("imbalance-black", state.gauge.black >= state.gauge.white + 30);
  $(".progress-gauge").toggleClass("imbalance-white", state.gauge.white >= state.gauge.black + 30);
  $(".progress-gauge").toggleClass("mana-balance", state.gauge.white >= 30 && state.gauge.black >= 30);
}

function setSoulGauge(soul) {
  state.gauge.soul = Math.max(0, Math.min(100, soul));

  $(".soul").text(`${state.gauge.soul} / 100`);
}

function setShroudGauge(shroud) {
  state.gauge.shroud = Math.max(0, Math.min(100, shroud));

  $(".shroud").text(`${state.gauge.shroud} / 100`);
}

// updates all action buttons state to be correct
function updateActions() {
  $(".actions .action").each(function() {
    const key = $(this).data("action");
    const action = getAction(key);

    $("img", this).prop("src", `img/${action.id}.png`);

    if(!state.hotkeyMode) {
      $(this).toggleClass("disabled", !actionUsable(key));
      $(this).toggleClass("highlight", action.highlight(state));
    } else {
      $(this).toggle(true);
      $(this).toggleClass("disabled", false);
      $(this).removeClass("highlight");
    }
  });
}

// saves hotkeys to localStorage
function saveHotkeys() {
  localStorage["rdmhotkeys"] = JSON.stringify(state.hotkeys);
}

// locads hotkeys from localStorage
function loadHotkeys() {
  try {
    var keybinds = JSON.parse(localStorage["rdmhotkeys"]);
    for(let [keybind, action] of Object.entries(keybinds)) {
      setHotkey(action, keybind, true);
    }
  } catch(e) {
    state.hotkeys = {};
  }
}

function hotkeyText(hotkey) {
  var mods = {
    shift: hotkey.indexOf("s") > -1,
    ctrl: hotkey.indexOf("c") > -1,
    alt: hotkey.indexOf("a") > -1
  };
  var key = parseInt(hotkey.replace(/[sca]/g, ""), 10);
  var mods = (mods.shift ? "⬆" : "") + (mods.ctrl ? "c" : "") + (mods.alt ? "a" : "");
  return `<sup>${mods}</sup>${keyCodes[key]}`;
}

function clearHotkey(action, dontSave) {
  var changed = false;
  for(let [key, skill] of Object.entries(state.hotkeys)) {
    if(action == skill) {
      delete state.hotkeys[key];
      $(`.action[data-action="${action}"] .keybind`).html("");
      changed = true;
    }
  }

  if(!dontSave && changed) saveHotkeys();
}

function setHotkey(action, keybind, dontSave) {
  clearHotkey(state.hotkeys[keybind]);
  state.hotkeys[keybind] = action;
  $(`.action[data-action="${action}"] .keybind`).html(hotkeyText(keybind));

  if(!dontSave) saveHotkeys();
}

var settingHooks = {};
var settingTypes = {};
function getSetting(name, initial) {
  if(typeof state.setting[name] == "undefined") {
    if(typeof localStorage["rdm" + name] == "undefined") {
      state.setting[name] = initial;
      return initial;
    }

    switch(getSettingType(name)) {
      case "boolean": state.setting[name] = (localStorage["rdm" + name] == "on"); break;
      case "string": state.setting[name] = localStorage["rdm" + name]; break;
      case "number": state.setting[name] = parseFloat(localStorage["rdm" + name]); break;
    }
  }

  return state.setting[name];
}

function setSetting(name, value) {
  state.setting[name] = value;
  switch(getSettingType(name)) {
    case "boolean":
      localStorage["rdm" + name] = value ? "on" : "off";
      break;
    case "string":
      localStorage["rdm" + name] = value;
      break;
    case "number":
      localStorage["rdm" + name] = value.toString();
      break;
  }

  syncSetting(name, value);
}

function syncSetting(name, value) {
  switch(getSettingType(name)) {
    case "boolean":
      $(`[data-setting="${name}"]`).prop("checked", value);
      break;
    case "string":
      $(`[data-setting="${name}"]`).val(value);
      break;
    case "number":
      $(`[data-setting="${name}"]`).val(value);
      break;
  }
  if(typeof settingHooks[name] == "function") {
    settingHooks[name](value);
  }
}

function getSettingType(name) {
  return settingTypes[name];
}

function loadSetting(name, initial, type, hook) {
  settingHooks[name] = hook;
  settingTypes[name] = type;
  syncSetting(name, getSetting(name, initial));
}

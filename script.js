let firstCard = null;
let secondCard = null;
let lockBoard = false;
let timerInterval = null;
let timerStarted = false;
let isFreshStart = false;
let completedLevels = JSON.parse(localStorage.getItem("completedLevels")) || {};
let replayCounts = JSON.parse(localStorage.getItem("replayCounts")) || {};
let score = parseInt(localStorage.getItem("score")) || 0;
let personalBest = parseInt(localStorage.getItem("personalBest")) || 0;
let clickCount = 0;
let startTime = 0;
let unlockedLevel = parseInt(localStorage.getItem("unlockedLevel")) || 1;
let currentLevel = 1;
let roundResets = 0;

function speak(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

function startLevel(level) {
  currentLevel = level;
  document.getElementById("level-display").textContent = `Level: ${level}`;
  isFreshStart = false;

  document.body.style.backgroundImage = `url(images/backgrounds/level${level}.jpg)`;
  document.getElementById("menu").style.display = "none";
  document.getElementById("leaderboard").style.display = "none";
  document.getElementById("game-board").innerHTML = "";
  clickCount = 0;
  startTime = Date.now();
  roundResets = 0;
  timerStarted = false;

  const animals = levelAnimals[level];
  const totalCards = levelCards[level];
  const pairs = [...animals, ...animals].slice(0, totalCards);
  const shuffled = pairs.sort(() => 0.5 - Math.random());

  const columns = Math.min(Math.ceil(totalCards / 2), 6);
  document.getElementById("game-board").style.gridTemplateColumns = `repeat(${columns}, 100px)`;

  shuffled.forEach((animal, index) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.animal = animal;
    card.dataset.index = index;
    card.addEventListener("click", handleClick);
    document.getElementById("game-board").appendChild(card);
  });

  firstCard = null;
  secondCard = null;
  lockBoard = false;
  document.getElementById("score").textContent = `Score: ${score}`;
}

function resetRound() {
  const confirmReset = confirm("Restart this round? It will cost you 10 points.");
  if (confirmReset) {
    score -= 10;
    document.getElementById("score").textContent = `Score: ${score}`;
    clearInterval(timerInterval);
    startLevel(currentLevel);
  }
}

function resetFullGame() {
  const confirmReset = confirm("Reset the entire game? This will erase your score and progress.");
  if (confirmReset) {
    score = 0;
    unlockedLevel = 1;
    localStorage.clear();
    clearInterval(timerInterval);
    document.getElementById("score").textContent = `Score: ${score}`;
    isFreshStart = true;
    resetGame();
  }
}

function handleClick(e) {
  const card = e.target;
  if (!timerStarted) {
    timerStarted = true;
    timerInterval = setInterval(() => {
      score -= 1;
      document.getElementById("score").textContent = `Score: ${score}`;
    }, 7000);
  }

  if (lockBoard || card.classList.contains("matched") || card === firstCard) return;

  card.style.backgroundImage = `url(images/animals/${card.dataset.animal}.png)`;
  card.classList.add("flipped");

  const article = /^[aeiou]/i.test(card.dataset.animal) ? "an" : "a";
  speak(`${article} ${card.dataset.animal}`);
  clickCount++;

  if (!firstCard) {
    firstCard = card;
  } else {
    secondCard = card;
    lockBoard = true;

    if (firstCard.dataset.animal === secondCard.dataset.animal) {
      firstCard.classList.add("matched-zoom");
      secondCard.classList.add("matched-zoom");

      setTimeout(() => {
        firstCard.classList.remove("matched-zoom");
        secondCard.classList.remove("matched-zoom");

        firstCard.classList.add("matched");
        secondCard.classList.add("matched");

        speak("Great job!");
        updateScore(true);
        checkLevelComplete();
        resetTurn();
      }, 2000);
    } else {
      setTimeout(() => {
        firstCard.style.backgroundImage = `url(images/card_back.png)`;
        secondCard.style.backgroundImage = `url(images/card_back.png)`;
        firstCard.classList.remove("flipped");
        secondCard.classList.remove("flipped");
        updateScore(false);
        resetTurn();
      }, 3000);
    }
  }
}

function updateScore(isMatch) {
  let penalty = currentLevel <= 6 ? 1 : 2;
  let reward = currentLevel <= 6 ? [6, 10, 12, 14, 16, 18][currentLevel - 1] : 20;

  score += isMatch ? reward : -penalty;
  document.getElementById("score").textContent = `Score: ${score}`;
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function saveProgress() {
  localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
  localStorage.setItem("score", score);
  localStorage.setItem("unlockedLevel", unlockedLevel);
}

function checkLevelComplete() {
  const matched = document.querySelectorAll(".card.matched").length;
  const total = levelCards[currentLevel];
  if (matched === total) {
    completedLevels[currentLevel] = score;
    localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    clearInterval(timerInterval);
    timerStarted = false;

    if (score > personalBest) {
      personalBest = score;
      localStorage.setItem("personalBest", personalBest);
    }

    speak("You completed the level!");
    unlockNextLevel();
    saveProgress();

    document.getElementById("popup").style.display = "flex";
  }
}

function unlockNextLevel() {
  const nextLevel = currentLevel + 1;
  const nextButton = document.querySelector(`button[data-level="${nextLevel}"]`);
  if (nextButton) {
    nextButton.disabled = false;
    unlockedLevel = nextLevel;
    localStorage.setItem("unlockedLevel", nextLevel);
  }
}

function resetGame() {
  document.getElementById("menu").style.display = "block";
  document.getElementById("game-board").innerHTML = "";
  document.getElementById("popup").style.display = "none";
  document.getElementById("leaderboard").style.display = "none";
}

function buildLevelButtons() {
  const container = document.getElementById("level-buttons");
  const unlocked = parseInt(localStorage.getItem("unlockedLevel")) || 1;
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Level ${i}`;
    btn.setAttribute("data-level", i);
    btn.disabled = i > unlocked;

    btn.onclick = () => {
      const wasCompleted = completedLevels[i] !== undefined && completedLevels[i] > 0;
      if (wasCompleted && !isFreshStart) {
        replayCounts[i] = (replayCounts[i] || 0) + 1;
        score = completedLevels[i] - (10 * replayCounts[i]);
        speak(`Replaying Level ${i}. Starting score is now ${score} after ${replayCounts[i]} penalties.`);
        localStorage.setItem("replayCounts", JSON.stringify(replayCounts));
      }
      startLevel(i);
    };

    container.appendChild(btn);
  }
}

function goToNextLevel() {
  const nextLevel = currentLevel + 1;
  document.getElementById("popup").style.display = "none";

  if (levelAnimals[nextLevel]) {
    startLevel(nextLevel);
  } else {
    alert(`You've completed all levels! Your final score is: ${score}`);
    resetGame();
  }
}

function showLeaderboard() {
  const leaderboard = document.getElementById("leaderboard");
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";

  list.innerHTML += `<li><strong>Your Current Score:</strong> ${score} pts</li>`;

  const personalScores = Object.values(completedLevels)
    .filter(s => s > 0)
    .sort((a, b) => b - a)
    .slice(0, 3);

  list.innerHTML += `<li><br><strong>Your Top Scores:</strong></li>`;
  if (personalScores.length === 0) {
    list.innerHTML += `<li>No completed levels yet.</li>`;
  } else {
    personalScores.forEach((score, i) => {
      list.innerHTML += `<li>#${i + 1}: ${score} pts</li>`;
    });
  }

  let globalScores = JSON.parse(localStorage.getItem("globalScores")) || [];
  if (!globalScores.includes(score)) {
    globalScores.push(score);
    globalScores = [...new Set(globalScores)].sort((a, b) => b - a).slice(0, 10);
    localStorage.setItem("globalScores", JSON.stringify(globalScores));
  }

  list.innerHTML += `<li><br><strong>Global Top 10:</strong></li>`;
  globalScores.forEach((s, i) => {
    list.innerHTML += `<li>#${i + 1}: ${s} pts</li>`;
  });

  const rank = globalScores.indexOf(score) + 1;
  list.innerHTML += `<li><br><strong>Your Rank:</strong> ${rank > 0 ? "#" + rank : "Unranked"}</li>`;

  document.getElementById("menu").style.display = "none";
  leaderboard.style.display = "flex";
}

function returnToMenu() {
  document.getElementById("leaderboard").style.display = "none";
  document.getElementById("menu").style.display = "block";

  const container = document.getElementById("level-buttons");
  if (container.children.length === 0) {
    buildLevelButtons();
  }
}

function buildLevelButtons() {
  const container = document.getElementById("level-buttons");
  container.innerHTML = "";
  const unlocked = parseInt(localStorage.getItem("unlockedLevel")) || 1;
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Level ${i}`;
    btn.setAttribute("data-level", i);
    btn.disabled = i > unlocked;

    btn.onclick = () => {
      const wasCompleted = completedLevels[i] !== undefined && completedLevels[i] > 0;
      if (wasCompleted && !isFreshStart) {
        replayCounts[i] = (replayCounts[i] || 0) + 1;
        score = completedLevels[i] - (10 * replayCounts[i]);
        speak(`Replaying Level ${i}. Starting score is now ${score} after ${replayCounts[i]} penalties.`);
        localStorage.setItem("replayCounts", JSON.stringify(replayCounts));
      }
      startLevel(i);
    };

    container.appendChild(btn);
  }
}

window.onload = buildLevelButtons;
// Fish Launch Game (p5.js)

let startTime;
let bgImg;
let fishImg;
let birdImg1;
let birdImg2;

let score;
let fish;
let birds = [];
let hitMarkers = [];
let hitMarkerDurationMsec = 250;
let hitMarkerSize = 50;
let fishSize = 100;

let birdIndex = 0;
let birdSize = 80;
let birdSizeMin = 30;
let birdSizeMax = 80;
let birdSpeedMin = 3;
let birdSpeedMax = 5;
let birdSpeedMaxRange = [5,9];

let maxBirdCount = 2;
let launchAngle = 0;
let launchSpeed = 8;

let rewardForCatch = 10;
let penaltyForMiss = 5;
let cooldown = 0;

let trial;
let trials = [];

// Load the image.
function preload() {
  bgImg = loadImage('assets/bg.png');
  fishImg = loadImage('assets/fish.png');
  birdImg1 = loadImage('assets/bird1.png');
  birdImg2 = loadImage('assets/bird2.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  fish = new Fish(width / 2, height - 50, fishSize, fishImg);
  score = new Score(rewardForCatch, penaltyForMiss);
  trial = new Trial();
  startTime = millis();
}

function draw() {
  imageMode(CORNER);
  image(bgImg, 0, 0, windowWidth, windowHeight);

  // Update and display birds
  for (let i = birds.length - 1; i >= 0; i--) {
    birds[i].update();
    birds[i].display();
    if (birds[i].offscreen()) {
      removeBird(i);
      continue;
    }
    
    // Check for collision
    if (fish.launched && fish.hits(birds[i])) {
      score.catch();
      trial.end(true, birds[i].index);
      hitMarkers.push(new HitMarker(birds[i].pos.x, birds[i].pos.y));
      removeBird(i);
      fish.reset();
    }
  }

  // Update and display fish
  if (fish.launched) {
    fish.update();
    trial.update();
    if (fish.offscreen()) {
      score.miss();
      fish.reset();
      trial.end(false, -1);
    }
  }
  fish.display(launchAngle);
  
  // Update and display hit markers
  for (let i = hitMarkers.length - 1; i >= 0; i--) {
    if (hitMarkers[i].isExpired()) {
      hitMarkers.splice(i, 1);
    } else {
      hitMarkers[i].display();
    }
  }

  // Launch cooldown and bird spawns
  if (cooldown <= 0 && random() < 0.01) {
    if (birds.length < maxBirdCount) {
      birdIndex += 1;
      birds.push(new Bird(birdIndex, birdSize));
    }
    cooldown = 30;
  } else {
    cooldown--;
  }
  
  // update bird size based on progress counter
  if (score.progress >= 2) {
    birdSize -= 2;
    birdSpeedMax += 0.2;
    score.progress = 0;
  } else if (score.progress <= -2) {
    birdSize += 2;
    birdSpeedMax -= 0.2;
    score.progress = 0;
  }
  birdSize = constrain(birdSize, birdSizeMin, birdSizeMax);
  birdSpeedMax = constrain(birdSpeedMax, birdSpeedMaxRange[0], birdSpeedMaxRange[1]);
  
  score.display();
}

function keyPressed() {
  if (typeof fish === 'undefined') {}
  else if (!fish.launched) {
    if (keyCode === LEFT_ARROW) {
      launchAngle -= PI / 30;
    } else if (keyCode === RIGHT_ARROW) {
      launchAngle += PI / 30;
    } else if (keyCode == 32) { // spacebar
      launchFish();
    }
  }
  if (key === 'd' || key === 'D') {
    saveTrials();
  }
}

function mousePressed() {
  launchFish();
}

function launchFish() {
  fish.launch(launchAngle, launchSpeed);
  trial.start();
}

function removeBird(i) {
  birds[i].end();
  trials.push(birds[i].toJSON());
  birds.splice(i, 1);
}

function mouseMoved() {
  if (typeof fish === 'undefined') {}
  else if (!fish.launched) {
    let dx = mouseX - fish.pos.x;
    let dy = mouseY - fish.pos.y;
    launchAngle = atan2(dy, dx);
  }
}

function drawRotatedImage(img, x, y, dw, dh, angle) {
  push();                      // Save current drawing settings
  translate(x, y);             // Move origin to image center
  rotate(angle);               // Rotate canvas by launchAngle (in radians)
  imageMode(CENTER);           // Draw image centered on (x, y)
  image(img, 0, 0, dw, dh);            // Draw at new origin (0,0)
  pop();                       // Restore drawing settings
}

class Fish {
  constructor(x, y, fishSize, fishImg) {
    this.origin = createVector(x, y);
    this.pos = this.origin.copy();
    this.size = fishSize;
    this.vel = createVector(0, 0);
    this.launched = false;
    this.fishImg = fishImg;
  }

  launch(launchAngle, launchSpeed) {
    if (!this.launched) {
      this.vel = p5.Vector.fromAngle(launchAngle);
      this.vel.setMag(launchSpeed);
      this.launched = true;
    }
  }

  update() {
    this.pos.add(this.vel);
  }

  display(launchAngle) {
    fill(255, 100, 100);
    imageMode(CENTER);
    drawRotatedImage(this.fishImg, this.pos.x, this.pos.y, this.size, this.size, launchAngle-PI);
  }

  hits(bird) {
    return dist(this.pos.x, this.pos.y, bird.pos.x, bird.pos.y) < birdSize;
  }

  reset() {
    this.pos = this.origin.copy();
    this.vel.set(0, 0);
    this.launched = false;
  }

  offscreen() {
    return this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height;
  }
}

class Bird {
  constructor(birdIndex, birdSize) {
    this.timeStart = millis() - startTime;
    this.timeEnd = undefined;
    this.birdIndex = birdIndex;
    this.pos = createVector(random() < 0.5 ? 0 : width, random(birdSize, height / 2 - 50));
    this.speed = random(birdSpeedMin, birdSpeedMax);
    this.vel = createVector(this.pos.x === 0 ? this.speed : -this.speed, 0);
    this.startPos_x = this.pos.x;
    this.startPos_y = this.pos.y;
    this.size = birdSize;
    
    this.images = [birdImg1, birdImg2];
    this.imageIndex = 0;
    this.timeIndex = 0;
    this.flapTime = round(map(this.speed, birdSpeedMin, birdSpeedMax, 25, 15));
  }

  update() {
    this.pos.add(this.vel);
  }
  
  end() {
    this.timeEnd = millis() - startTime;
  }
  
  toJSON() {
    return {
      bird_index: this.birdIndex,
      time_start: this.timeStart,
      time_end: this.timeEnd,
      start_pos_x: this.startPos_x,
      start_pos_y: this.startPos_y,
      end_pos_x: this.pos.x,
      end_pos_y: this.pos.y,
      speed: this.speed,
      size: this.size,
    };
  }

  display() {
    this.timeIndex += 1;
    if (this.timeIndex > this.flapTime) {
      this.timeIndex = 0;
      this.imageIndex = this.imageIndex == 0 ? 1 : 0;
    }
    let curBirdImg = this.images[this.imageIndex];
    
    fill(255);
    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel.x < 0) {
      // flip image horizontally if bird is flying left
      scale(-1, 1);
    }
    imageMode(CENTER);
    image(curBirdImg, 0, 0, 1.5*this.size, 1.5*this.size);
    pop();
  }
  
  offscreen() {
    return this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height;
  }
} 


class Score {
  constructor(rewardForCatch, penaltyForMiss) {
    this.rewardForCatch = rewardForCatch;
    this.penaltyForMiss = penaltyForMiss;
    this.score = 0;
    this.streakLength = 0;
    this.progress = 0;
  }
  
  reset() {
    this.score = 0;
  }
  
  catch() {
    this.score += this.rewardForCatch;
    if (this.streakLength >= 0) {
      this.streakLength += 1;
      this.progress += 1;
    } else {
      this.streakLength = 1;
      this.progress = 1;
    }
  }
  
  miss() {
    this.score -= this.penaltyForMiss;
    if (this.streakLength <= 0) {
      this.streakLength -= 1;
      this.progress -= 1;
    } else {
      this.streakLength = -1;
      this.progress = -1;
    }
  }
  
  display() {
    fill(0);
    textSize(18);
    text(`Score: ${this.score}`, 10, 20);
    
    this.curDifficulty = round(map(-birdSize, -birdSizeMax, -birdSizeMin, 0, (birdSizeMax-birdSizeMin)/2));
    text(`Difficulty: ${this.curDifficulty}`, 150, 20);
    
    let streakDisp = max(0, this.streakLength);
    text(`Streak: ${streakDisp}`, 300, 20);
  }
}

class HitMarker {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.timestamp = millis(); // Record creation time
    this.duration = hitMarkerDurationMsec; // duration
  }

  isExpired() {
    return millis() - this.timestamp > this.duration;
  }

  display() {
    fill(0, 255, 0);
    textSize(24);
    text(`+${rewardForCatch}`, this.pos.x, this.pos.y);
  }
}

class Trial {
  constructor() {
    this.trial_index = -1;
  }
  
  start() {
    // current time, score, difficulty, streak
    this.trial_index += 1;
    this.time_start = millis() - startTime;
    this.score = score.score;
    this.streak_length = score.streakLength;
    this.difficulty = score.curDifficulty;
    
    // agent size, position, launch angle, launch speed
    this.agent_cursor_x = mouseX;
    this.agent_cursor_y = mouseY;
    this.agent_size = fish.size;
    this.agent_pos_x = fish.pos.x;
    this.agent_pos_y = fish.pos.y;
    this.launch_angle = launchAngle;
    this.launch_speed = launchSpeed;
    
    this.bird_index_caught = undefined;
    this.bird1_index = undefined;
    this.bird1_pos_x = undefined;
    this.bird1_pos_y = undefined;
    this.bird1_speed = undefined;
    this.bird1_size = undefined;
    this.bird2_index = undefined;
    this.bird2_pos_x = undefined;
    this.bird2_pos_y = undefined;
    this.bird2_speed = undefined;
    this.bird2_size = undefined;
    
    // bird 1 position, speed, size
    if (birds.length > 0) {
      this.bird1_index = birds[0].index;
      this.bird1_pos_x = birds[0].pos.x;
      this.bird1_pos_y = birds[0].pos.y;
      this.bird1_speed = birds[0].speed;
      this.bird1_size = birds[0].size;
    }
    // bird 2 position, speed, size
    if (birds.length > 1) {
      this.bird2_index = birds[1].index;
      this.bird2_pos_x = birds[1].pos.x;
      this.bird2_pos_y = birds[1].pos.y;
      this.bird2_speed = birds[1].speed;
      this.bird2_size = birds[1].size;
    }
    
    this.wasSuccess = false;
    this.closestDistance = Number.MAX_VALUE;
    this.closest_agent_pos_x = undefined;
    this.closest_agent_pos_y = undefined;
    this.closest_bird_pos_x = undefined;
    this.closest_bird_pos_y = undefined;
    this.update();
  }
  
  update() {
    for (let i = 0; i < birds.length; i += 1) {
      let cDist = dist(fish.pos.x, fish.pos.y, birds[i].pos.x, birds[i].pos.y);
      if (cDist < this.closestDistance) {
        this.closestDistance = cDist;
        this.closest_bird_pos_x = birds[i].pos.x;
        this.closest_bird_pos_y = birds[i].pos.y;
        this.closest_agent_pos_x = fish.pos.x;
        this.closest_agent_pos_y = fish.pos.y;
      }
    }
  }
  
  end(wasHit, birdIndex) {
    this.bird_index_caught = birdIndex;
    this.time_end = millis() - startTime;
    this.wasSuccess = wasHit;
    trials.push(this.toJSON());
  }
  
  toJSON() {
    // outputs all of object's variables as a json object
    return Object.assign({}, this);
  }
}

function saveTrials() {
  let jsonString = JSON.stringify(trials, null, 2); // Pretty-print with 2-space indent

  // Create a Blob from the JSON string
  let blob = new Blob([jsonString], { type: 'application/json' });

  // Create a temporary download link
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

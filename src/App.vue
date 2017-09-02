<template>
  <v-app light>
    <v-toolbar fixed>
      <v-toolbar-title>Election Streetview</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items>
        <v-btn v-if='gameActive || gameEnd' flat>
          <big>Score: {{ score }}</big>
        </v-btn>
      </v-toolbar-items>
    </v-toolbar>
    <main>
      <v-container fluid style='padding-top:0px;'>
        <v-slide-y-transition mode="out-in">
          <v-layout column align-center>
            <div>
              <gmap-street-view-panorama
                :position="mapPosition"
                :zoom="0"
                ref="streetview"
                style="width:90vw; min-height:500px;"
              ></gmap-street-view-panorama>
              <v-dialog v-model="showGuessResult" persistent width=70%>
                <v-card>
                  <v-card-title class="headline">{{ guessResult }}</v-card-title>
                  <v-card-text>
                    {{ locationMessage }}<br>
                    {{ voteDataMessage }}
                  </v-card-text>
                  <gmap-map
                    :center="mapPosition"
                    :zoom="8"
                    style="width:100%; min-height:350px; margin: 0 auto;"
                    ref="mapResult"
                  >
                    <gmap-marker :position="mapPosition"></gmap-marker>
                  </gmap-map>
                  <v-card-actions>
                    <v-btn primary @click.native="advanceGame">Next</v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>
              <v-dialog v-model="showStartModal" persistent width=50%>
                <v-card>
                  <v-card-title class="headline">
                    The 2016 Presidential Election in Streetview
                  </v-card-title>
                  <v-card-text>Can you tell the difference between Red and Blue America
                    from what its streets look like? This game will show you ten different
                    locations in the U.S. using Google StreetView. See if you can guess
                    whether that county voted for Trump or Clinton in 2016.
                  </v-card-text>
                  <v-card-actions>
                    <v-btn primary @click.native="startGame">Start Game</v-btn>
                  </v-card-actions>
                </v-card>
              <v-dialog v-model="showEndModal" persistent width=80%>
                <v-card>
                  <v-card-title class="headline">
                    Your final score is {{ score }}!
                  </v-card-title>
                  <gmap-map
                    :center="{lat: 37.2312178, lng: -86.8040039}"
                    :zoom="4"
                    style="width:100%; min-height:350px; margin: 0 auto;"
                  >
                    <gmap-marker
                    v-for="(point, key) in mapHistory"
                    :position="point.location"
                    :class="point.outcome"
                    :key="key"
                    >
                    </gmap-marker>
                  </gmap-map>
                  <v-card-actions>
                    <v-btn primary @click.native="startGame">Start Over</v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>
              </v-dialog>
            </div>
            <div v-if='gameActive'>
              <v-btn @click='guess(0)'>Democratic</v-btn>
              <v-btn @click='guess(1)'>Republican</v-btn>
            </div>
            <div v-else>
              <v-btn @click='startGame'>Start Over</v-btn>
            </div>
          </v-layout>
        </v-slide-y-transition>
      </v-container>
    </main>
  </v-app>
</template>

<script>
/* global google */
// import axios from 'axios';
import utils from '@/components/utils';
import dataGop from 'static/gop.json';
import dataDem from 'static/dem.json';
import turf from 'turf';

export default {
  data() {
    return {
      dataset: {},
      mapPosition: {
        lat: 37.869260,
        lng: -122.254811,
      },
      currentCounty: null,
      gameActive: false,
      gameEnd: false,
      gameData: [],
      gamePosition: 0,
      gameResults: [],
      gameHistory: [],
      guessed: null,
      guessResult: '',
      showStartModal: false,
      showEndModal: false,
      showGuessResult: false,
      sv: null,
    };
  },
  computed: {
    score() {
      const numerator = this.gameResults.reduce((a, b) => a + b, 0);
      const denominator = this.gamePosition;
      return `${numerator} / ${denominator}`;
    },
    locationMessage() {
      let message = '';
      if (this.currentCounty) {
        const state = utils.stateFips(this.currentCounty.properties.STATEFP);
        message = `You are in ${this.currentCounty.properties.county}, ${state}.`;
      }
      return message;
    },
    voteDataMessage() {
      let message = '';
      if (this.currentCounty) {
        const county = this.currentCounty.properties;
        const votesDem = county.dem_2016;
        const votesGop = county.gop_2016;
        const votesTot = county.total_2016;
        const perDem = parseInt((votesDem / votesTot) * 100, 10);
        const perGop = parseInt((votesGop / votesTot) * 100, 10);
        const demWinner = perDem > perGop;
        if (demWinner) {
          message = `${perDem}% of voters in this county voted for Hillary Clinton in 2016.`;
        } else {
          message = `${perGop}% of voters in this county voted for Donald Trump in 2016.`;
        }
      }
      return message;
    },
    mapHistory() {
      let res = {};
      const vm = this;
      if (this.gameHistory.length > 0) {
        res = vm.gameResults.map((currentValue, index) => {
          const outcome = currentValue ? 'correct' : 'incorrect';
          return { guess: outcome, location: vm.gameHistory[index] };
        });
      }
      return res;
    },
  },
  methods: {
    getCounty(party) {
      const dataset = (party === 0) ? this.dataDem : this.dataGop;
      const counties = dataset.features;
      const county = counties[Math.floor(Math.random() * counties.length)];
      return county;
    },
    fitRandomPoint(polygon) {
      const bBox = turf.bbox(polygon);
      const random = turf.random('points', 100, { bbox: bBox }).features;
      let found = null;
      for (let i = 0; i < random.length; i += 1) {
        if (turf.inside(random[i], polygon)) {
          found = random[i];
        }
      }
      if (!found) {
        this.fitRandomPoint(polygon);
      }
      return found;
    },
    getPoint(party) {
      const county = this.getCounty(party);
      this.currentCounty = county;
      const countyNegativeBuffer = turf.buffer(county, -0.5);
      const point = this.fitRandomPoint(countyNegativeBuffer);
      const coords = point.geometry.coordinates;
      this.checkPoint({ lat: coords[1], lng: coords[0] });
    },
    startGame() {
      this.getGame();
      this.gamePosition = 0;
      this.gameResults = [];
      this.gameHistory = [];
      this.gameEnd = false;
      this.gameActive = true;
      this.showEndModal = false;
      this.showStartModal = false;
    },
    getGame() {
      const starterArray = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
      this.gameData = utils.shuffle(starterArray);
      this.getPoint(this.gameData[0]);
    },
    guess(party) {
      const result = this.gameData[this.gamePosition] === party;
      this.guessed = party;
      this.gameResults.push(result);
      this.gameHistory.push(this.mapPosition);
      this.gamePosition += 1;
      this.guessResult = result ? 'Correct!' : 'Incorrect!';
      this.showGuessResult = true;
      this.$gmapDefaultResizeBus.$emit('resize');
    },
    advanceGame() {
      this.showGuessResult = false;
      if (this.gamePosition === 10) {
        this.endGame();
      } else {
        const newParty = this.gameData[this.gamePosition];
        this.getPoint(newParty);
      }
    },
    endGame() {
      this.gameActive = false;
      this.gameEnd = true;
      this.$gmapDefaultResizeBus.$emit('resize');
      this.showEndModal = true;
    },
    moveMap(newPosition) {
      const mapOptions = {
        addressControl: false,
        showRoadLabels: false,
      };
      this.$refs.streetview.$panoObject.setPosition(newPosition);
      this.$refs.streetview.$panoObject.setOptions(mapOptions);
      this.mapPosition = newPosition;
    },
    checkPoint(newPosition) {
      if (this.sv === null) {
        this.sv = new google.maps.StreetViewService();
      }
      this.sv.getPanorama({
        location: newPosition,
        radius: 500,
      }, this.svCallback);
    },
    svCallback(data, status) {
      if (status === 'OK') {
        this.moveMap(data.location.latLng);
      } else {
        console.log('Street View data not found for this location.');
        this.getPoint(this.gameData[this.gamePosition]);
      }
    },
  },
  mounted() {
    this.showStartModal = true;
    this.dataDem = dataDem;
    this.dataGop = dataGop;
  },
};
</script>

<style lang="stylus">
@import './stylus/main'
</style>

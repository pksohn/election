<template>
<gmap-street-view-panorama
  :position="position"
  :zoom="zoom"
  ref="map"
></gmap-street-view-panorama>
</template>

<script>
  export default {
    props: ['position'],
    data() {
      return {
        zoom: 0,
        testLocation: {
          lat: 37.7608142,
          lng: -122.4394272,
        },
      };
    },
    methods: {

    },
    mounted() {
      setTimeout(() => this.$refs.map.$panoObject.setPosition(this.testLocation), 5000);
    },
  };
</script>

<style scoped>
gmap-street-view-panorama {
  width:100vw;
  min-height:500px;
}
</style>

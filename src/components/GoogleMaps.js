export default {
  install(Vue) {
    const googleMapScript = document.createElement('SCRIPT');
    const key = 'AIzaSyCg35hSwLpicqA7jCEZFZ3KsuMBvQ4Zc20'
    const url = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    googleMapScript.setAttribute('src', url);
  },
};

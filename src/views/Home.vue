<template>
  <!-- <Timer v-if="showTimer" @closeTimer="toggleTimer" /> -->
  <div class="view-container">
    <div class="container">
      <div class="top-part" style="display: flex; padding: 50px">
        <div style="flex: 1; background-color: none"></div>
        <div style="background-color: none">
          <h1>hello {{ userName }}, welcome to home page:</h1>
        </div>
        <div style="flex: 1; background-color: none"></div>
      </div>

      <div class="main-part" style="height: 100%">
        <div class="part" style="float: left">
          <h1 style="margin: 10px; color: var(--mainColor)">//options:</h1>
          <div class="cont">
            <!-- allow past updates checkbox -->
            <div style="display: flex; align-items: center">
              <label for="allowUpdates" style="padding: 20px">
                allow every day updates</label>
              <input
                type="checkbox"
                id="allowUpdates"
                @click="toggleAllowUpdates"
                :checked="allowUpdates"
              />
            </div>
            <!-- style switcher -->
            <PageStyleSwitcher/>

          </div>
        </div>
        <div class="part" style="float: right">
          <h1 style="margin: 10px; color: var(--mainColor)">//forest:</h1>
          <!-- <h1 style="color:#9cdcfe">//future feature</h1> -->
          <Forest></Forest>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from "@/supabase";
import { store } from "@/store/store";

import Forest from "@/components/forest/Forest.vue";
import Timer from "@/components/forest/Timer.vue";
import FormButton from "@/components/user_interface/FormButton.vue";
import PageStyleSwitcher from "@/components/PageStyleSwitcher.vue";

export default {
  name: "HomeView",
  components: {
    Forest,
    Timer,
    FormButton,
    PageStyleSwitcher
  },
  data() {
    return {
      store,
      // showTimer: false,
    };
  },
  computed: {
    userName() {
      if (store.user != null) {
        const fullEmail = store.user.email;
        const userName = fullEmail.split("@")[0];
        return userName;
      }
    },
    allowUpdates() {
      if (store.userData != null) {
        return store.userData.allow_updates;
      }
    },
  },
  methods: {
    toggleAllowUpdates(){
      store.userData.allow_updates = !store.userData.allow_updates;
    }
  },
  mounted() {


  },
};
</script>

<style scoped>
.container {
  width: 100%;
  height: 100%;
  background-color: var(--background3);
  display: flex;
  flex-direction: column;
  /* justify-content: space-evenly; */
  justify-content: start;
}

.cont {
  /* background-color: yellow; */
  height: 100%;
  width: 100%;
  border-radius: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* border-color: #2b2b2b;
border-style: solid; */
}

.part {
  float: left;
  width: 48%;
  background-color: var(--background1);
  margin: 1%;
  height: 90%;
  border-radius: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-color: var(--background4);
  border-style: solid;
  /* position: relative; */
}

input[type="checkbox"] {
  position: relative;
  width: 60px;
  height: 30px;
  -webkit-appearance: none;
  background: var(--background3);
  outline: none;
  border-radius: 20px;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  transition: 0.5s;
}

input[type="checkbox"]:checked {
  background: var(--background4);
}

input[type="checkbox"]:before {
  content: "";
  position: absolute;
  width: 27px;
  height: 27px;
  border-radius: 20px;
  top: 0;
  left: 0;
  background: var(--checkBox);
  /* transform: scale(1.1); */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: 0.5s;
}

input:checked[type="checkbox"]:before {
  left: 32px;
  background: var(--mainColor);
  transform: scale(1.1);
}
</style>
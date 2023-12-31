import { reactive } from 'vue'
import { supabase } from '@/supabase';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import mitt from "mitt";

import { isProxy, toRaw } from 'vue';

import { createToast } from "mosha-vue-toastify";
import "mosha-vue-toastify/dist/style.css";


export const store = reactive({

  //session user
  user: null,
  //user data like chosen page style, allow updates
  userData: null,
  //all tasks with all executions
  tasks: [],
  //todays date
  todaysDate: null,
  //used in day's tasks to retrieve proper data
  currentDisplayDate: null,
  //list of filtered tasks accoring to currentDisplayDate
  currentDateTasks: [], //TODO: rename to currentDayData
  //calendar data
  currentCalendarData: [],
  //used to check if data is ready to be used
  callendarDatesAreSet: false,
  // global event emitter
  emitter: mitt(),
  //list of currently displayed forest
  trees: [],
  // chosen style from localStorage
  chosenStyle: null,

  // retrive all required data once user is logged in
  setSession(session) {
    this.user = session ? session.user : null;

    if (this.user != null && this.currentDisplayDate == null) {
      this.retreiveDate();
      //habits page
      this.retrieveCurrentDayData();
      // callendar page
      this.retrieveCurrentCalendarData();
      this.getUserData();
      // forest
      this.getTreeData();

      // handling TaskItem event
      this.emitter.on("toggleTask", (data) => {
        this.delayToggleTaskCompletion(data.task, data.currentDate);
      });
    }
  },

  async getUserData() {
    try {
      const { data, error } = await supabase.from('users').select(`
      id, nickname, allow_updates, chosen_style
      `).eq('id', this.user.id);
      if (error) throw error;
      // assign retrieved data
      if (data[0] != undefined) this.userData = data[0];
      //create new user if there was no data
      else {
        const { data, error } = await supabase.from('users')
          .insert({ id: this.user.id }).select();
        if (error) throw error;
        this.userData = data[0];
      }
    } catch (error) {
      this.showErrorNotification(error.message);
    }
  },
  async getTreeData() {
    try {
      const date = dayjs(this.todaysDate).startOf('day').add(0, 'day').toISOString();
      const { data, error } = await supabase.from('forests').select(`
      user_id, trees, date`)
        .eq('user_id', this.user.id)
        .eq('date', date);
      if (error) throw error;

      if (data[0] != null) this.trees = toRaw(data[0].trees);
      else {
        const { data, error } = await supabase.from('forests')
          .insert({ user_id: this.user.id, trees: [], date: date }).select();
        if (error) throw error;
        this.trees = toRaw(data[0].trees);
      }
    } catch (error) {
      this.showErrorNotification(error.message);
    }
  },

  async addRandomTree() {

    try {
      const date = dayjs(this.todaysDate).startOf('day').add(0, 'day').toISOString();
      // console.log(typeof(this.trees))
      const trees_copy = toRaw(this.trees);
      // console.log(trees_copy)
      const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
      const availableNumbers = allNumbers.filter((num) => !trees_copy.includes(num));

      if (availableNumbers.length === 0) return;

      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const randomNumber = availableNumbers[randomIndex];
      this.trees.push(randomNumber);

      const { data, error } = await supabase.from('forests')
        .update({ trees: toRaw(this.trees) })
        .eq('user_id', store.user.id)
        .eq('date', date).select();

      if (error) throw error;
      this.trees = toRaw(data[0].trees);

    } catch (error) {
      this.showErrorNotification(error.message);
    }
  },
  delayToggleTaskCompletion(task, date) {

    const cancelEventName = "cancel" + task.name + date;
    let sendRequest = true;

    this.emitter.on(cancelEventName, (data) => {
      sendRequest = false;
    });

    setTimeout(() => {
      if (sendRequest) this.toggleTaskCompletion(task, date)
    }, 2000)

  },
  retreiveDate(displayDateOffset = 0) {
    //get todays date according to timezone
    dayjs.extend(utc);
    dayjs.extend(timezone);
    this.todaysDate = dayjs().tz('Europe/Warsaw').format('YYYY-MM-DD');
    this.currentDisplayDate = dayjs(this.todaysDate).startOf('day').add(displayDateOffset, 'day').toISOString();
  },
  processDayData(data, date) {
    if (date == null) date = this.currentDisplayDate;
    // add task to day's list based on logic depending on the tasks type
    return data.filter(task => {
      if (task.executions != null) {
        //multiple executions error
        if (task.executions.length > 1) this.showErrorNotification("Multiple executions for one day");
        task.executions = task.executions[0];
      }
      //decide whether task should be added based on its type
      if (task.type === "REGULAR") return true
      else if (task.type === "UNTIL_DONE") return (task.keep_on || task.executions)
      else if (task.type === "ON_DATE") return dayjs(date).isSame(dayjs(task.policies.date_to, 'YYYY-MM-DD'), 'day') || task.executions;
      else if (task.type === "UNTIL_DATE") {
        return (task.keep_on && !dayjs(date).isAfter(dayjs(task.policies.date_to, 'YYYY-MM-DD'), 'day')) || task.executions;
      }
      else {
        this.showErrorNotification("Unvalid type task in database");
        return false;
      }
    });
  },
  async retrieveCurrentDayData(offset = 0) {
    try {
      this.currentDateTasks = [];
      //get current days date including offset
      this.currentDisplayDate = dayjs(this.currentDisplayDate).startOf('day').add(offset, 'day').toISOString(); //TODO: what if date is null at first
      //get tasks and executions data
      const { data, error } = await supabase.from('tasks').select(`
        id, name, description, completed, type, keep_on,
        executions(id, created_at, is_done, task_date, task_id),
        policies(task_id, date_from, date_to, keep_on)`)
        .eq('user_id', this.user.id)
        .eq('executions.task_date', this.currentDisplayDate);
      if (error) throw error;
      //filter through tasks selecting only regular ones and single ones with proper date
      //change executions from one element lists into an single objects
      this.currentDateTasks = this.processDayData(data);
    } catch (error) {
      this.showErrorNotification(error.message);
    }
  },
  async retrieveCurrentCalendarData() {
    try {
      this.callendarDatesAreSet = false;
      this.currentCalendarData = [];
      const previousWeekMonday = dayjs(this.todaysDate).startOf('week').subtract(6, 'day').toISOString();
      const nextWeekSunday = dayjs(this.todaysDate).startOf('week').add(15, 'day').toISOString();
      //get tasks and executions data
      const { data, error } = await supabase.from('tasks').select(`
      id, name, description, completed, type, keep_on,
      executions(id, created_at, is_done, task_date, task_id),
      policies(task_id, date_from, date_to, keep_on)
      `).eq('user_id', this.user.id)
        .filter('executions.task_date', 'gte', previousWeekMonday)
        .filter('executions.task_date', 'lte', nextWeekSunday);
      if (error) throw error
      //create empty list of 21 days and fill it
      this.tasks = data;  //TODO: delete global task list????
      const firstDay = dayjs(this.todaysDate).startOf('week').subtract(6, 'day');
      for (let i = 0; i < 21; i++) { // 21 days for 3 weeks
        const date = firstDay.add(i, 'day');
        // get temp tasks list with only executions for particular day
        let temp = data.map(task => {
          let task_copy = { ...task };
          task_copy.executions = task.executions.filter(ex => {
            return dayjs(ex.task_date, 'YYYY-MM-DD').isSame(dayjs(date, 'YYYY-MM-DD'), 'day');
          });
          return task_copy;
        });
        temp = this.processDayData(temp, date);
        this.currentCalendarData.push({ date: date, tasks: temp });  //TODO: organize differently
      }
    } catch (error) {
      this.showErrorNotification(error.message);
    } finally {
      this.callendarDatesAreSet = true;
    }


  },
  async addTask(task, date = null) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ name: task.name, description: task.description, completed: task.completed, user_id: this.user.id, type: task.type }).select();
      if (error) throw error;
      const new_task = data[0];

      // create policy for UNTIL_DATE type
      if (task.type === "UNTIL_DATE" || task.type === "ON_DATE") {
        const temp_date = date ? date : this.currentDisplayDate;
        const { data, error } = await supabase
          .from('policies')
          .insert({ task_id: new_task.id, keep_on: true, date_to: temp_date }).select();
        if (error) throw error;
      }
      //TODO: delete global tasks list?
      this.tasks.push({ ...data[0] });
      if (task.type === "UNTIL_DONE" || task.type === "REGULAR" || dayjs(date).isSame(dayjs(this.currentDisplayDate), 'day'))
        this.currentDateTasks.push({ ...data[0] });
    } catch (error) {
      this.showErrorNotification(error.message);
    } finally {
      //update callendar singleTasks list
      this.retrieveCurrentCalendarData();
    }
  },
  async toggleTaskCompletion(task, currentDate) {
    try {
      if (task.type == "UNTIL_DONE" || task.type == "UNTIL_DATE") {
        const { error } = await supabase
          .from('tasks')
          .update({ keep_on: !task.keep_on })
          .eq('id', task.id)
        if (error) throw error;
        task.keep_on = !task.keep_on;
      }
      //update execution depending on the task's type or create new one
      if (task.executions != null) {
        const { error } = await supabase.from('executions').delete().eq('id', task.executions.id);
        if (error) throw error;
        task.executions = null;
      } else {
        const { data, error } = await supabase
          .from('executions')
          .insert({ task_id: task.id, is_done: true, task_date: currentDate }).select();
        if (error) throw error;
        task.executions = data[0];
      }
    } catch (error) {
      this.showErrorNotification(error.message);
    } finally {
      //update callendar singleTasks list
      this.retrieveCurrentCalendarData();
    }
  },
  async removeTask(task) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (error) throw error;
      this.tasks = this.tasks.filter(t => t.id != task.id);
      this.currentDateTasks = this.currentDateTasks.filter(t => t.id != task.id);
      this.showNotification("Delete completed");
    } catch (error) {
      this.showErrorNotification(error.message);
    } finally {
      //update callendar singleTasks list
      this.retrieveCurrentCalendarData();
    }
  },

  showErrorNotification(message) {
    createToast(
      {
        title: "An error has occured",
        description: message,
      },
      {
        timeout: 7000,
        toastBackgroundColor: "#aa0000",
        hideProgressBar: true,
        position: 'top-center',
        type: 'danger',
        showIcon: true,
      }
    );
  },
  showNotification(message) {
    const toastColor = getComputedStyle(document.body).getPropertyValue('--mainColor');
    createToast(
      {
        title: "Database has been updated",
        description: message,
      },
      {
        timeout: 5000,
        toastBackgroundColor: toastColor,
        hideProgressBar: true,
        position: 'top-center',
        type: 'success',
        showIcon: true,
      }
    );
  },

})
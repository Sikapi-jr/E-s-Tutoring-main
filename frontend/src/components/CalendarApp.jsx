import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from '../components/UserProvider';
import { useNavigate } from "react-router-dom";

const CalendarApp = () => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthsOfYear = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const currentDate = new Date()

  //
  const { user } = useUser('');
  const parent = user.username;
  const email = user.email;
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);
  //

  const eventRefs = useRef({});
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth())
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear())
  const [selectedDate, setSelectedDate] = useState(currentDate)
  const [showEventPopup, setShowEventPopup] = useState(false)
  const [events, setEvents] = useState([])
  const [eventTime, setEventTime] = useState({ hours: '00', minutes: '00' })
  const [eventText, setEventText] = useState('')
  const [editingEvent, setEditingEvent] = useState(null)

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  const prevMonth = () => {
    setCurrentMonth((prevMonth) => (prevMonth === 0 ? 11 : prevMonth - 1))
    setCurrentYear((prevYear) => (currentMonth === 0 ? prevYear - 1 : prevYear))
  }

  const nextMonth = () => {
    setCurrentMonth((prevMonth) => (prevMonth === 11 ? 0 : prevMonth + 1))
    setCurrentYear((prevYear) => (currentMonth === 11 ? prevYear + 1 : prevYear))
  }

  
  useEffect(() => {
    const fetchRequests = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/parentCalendar/?parent=${parent}`);
            //const response = await axios.get(`http://127.0.0.1:8000/api/weeklyHours`);
            const eventsWithParsedDates = response.data.map(event => ({
              ...event, 
              date: new Date(event.date),
            }));

                  // Create a ref for each event
            eventsWithParsedDates.forEach(event => {
              const dateKey = event.date.toDateString(); 
              if (!eventRefs.current[dateKey]) {
                eventRefs.current[dateKey] = React.createRef();
              }
            });

            setEvents(eventsWithParsedDates);
            
        }
        catch (error) {
            console.error("Error fetching user requests:", error);
          }
    }
    if (parent) {
        fetchRequests();
      }

}, [parent]);

  const handleDayClick = (day) => {
    const clickedDate = new Date(currentYear, currentMonth, day)
    const today = new Date()

    if (clickedDate <= today || isSameDay(clickedDate, today)) {
      setSelectedDate(clickedDate)
      const dateKey = clickedDate.toDateString();
      const ref = eventRefs.current[dateKey];

      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      //setShowEventPopup(true)
      //setEventTime({ hours: '00', minutes: '00' })
      //setEventText('')
      //setEditingEvent(null)
    }
  }

  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const isEventDay = (day) => {
    return events.some(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === currentYear &&
        eventDate.getMonth() === currentMonth &&
        eventDate.getDate() === day
      );
    });
  };

  const handleEventSubmit = () => {
    const newEvent = {
      id: editingEvent ? editingEvent.id : Date.now(),
      date: selectedDate,
      time: `${eventTime.hours.padStart(2, '0')}:${eventTime.minutes.padStart(2, '0')}`,
      text: eventText,
    }

    let updatedEvents = [...events]

    if (editingEvent) {
      updatedEvents = updatedEvents.map((event) =>
        event.id === editingEvent.id ? newEvent : event,
      )
    } else {
      updatedEvents.push(newEvent)
    }

    updatedEvents.sort((a, b) => new Date(a.date) - new Date(b.date))

    setEvents(updatedEvents)
    setEventTime({ hours: '00', minutes: '00' })
    setEventText('')
    setShowEventPopup(false)
    setEditingEvent(null)
  }

  const handleEditEvent = (event) => {
    setSelectedDate(new Date(event.date))
    setEventTime({
      hours: event.time.split(':')[0],
      minutes: event.time.split(':')[1],
    })
    setEventText(event.text)
    setEditingEvent(event)
    setShowEventPopup(true)
  }

  const handleDeleteEvent = async (eventId) => {
    //const updatedEvents = events.filter((event) => event.id !== eventId)
    //setEvents(updatedEvents)

    setShowReplyBox(true);
    setEventId(eventId);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Starting submit");
    const payload = {
      eventId,
      message,
      email
    }
    try{
      const response = await axios.post(`http://127.0.0.1:8000/api/dispute/`, payload);
    }
    catch (error){
      console.error("Could not send dispute");
    }
    

  }

  const handleTimeChange = (e) => {
    const { name, value } = e.target

    setEventTime((prevTime) => ({ ...prevTime, [name]: value.padStart(2, '0') }))
  }

  return (
    
    <div className="calendar-app">
      <div className="calendar">
        <h1 className="heading">Calendar</h1>
        <div className="navigate-date">
          <h2 className="month">{monthsOfYear[currentMonth]},</h2>
          <h2 className="year">{currentYear}</h2>
          <div className="buttons">
            <i className="bx bx-chevron-left" onClick={prevMonth}></i>
            <i className="bx bx-chevron-right" onClick={nextMonth}></i>
          </div>
        </div>
        <div className="weekdays">
          {daysOfWeek.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="days">
          {[...Array(firstDayOfMonth).keys()].map((_, index) => (
            <span key={`empty-${index}`} />
          ))}
          {[...Array(daysInMonth).keys()].map((day) => (
            <span
              key={day + 1}
              className={`day-cell
                ${day + 1 === currentDate.getDate() &&
                 currentMonth === currentDate.getMonth() &&
                 currentYear === currentDate.getFullYear() ? 'current-day' : ''}
                ${isEventDay(day + 1) ? 'has-event' : ''}
              `}
              onClick={() => handleDayClick(day + 1)}
            >
              {day + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="events">
        {showEventPopup && (
          <div className="event-popup">
            <div className="time-input">
              <div className="event-popup-time">Time</div>
              <input
                type="number"
                name="hours"
                min={0}
                max={24}
                className="hours"
                value={eventTime.hours}
                onChange={handleTimeChange}
              />
              <input
                type="number"
                name="minutes"
                min={0}
                max={60}
                className="minutes"
                value={eventTime.minutes}
                onChange={handleTimeChange}
              />
            </div>
            <textarea
              placeholder="Enter Event Text (Maximum 60 Characters)"
              value={eventText}
              onChange={(e) => {
                if (e.target.value.length <= 60) {
                  setEventText(e.target.value)
                }
              }}
            ></textarea>
            <button className="event-popup-btn" onClick={handleEventSubmit}>
              {editingEvent ? 'Update Event' : 'Add Event'}
            </button>
            <button className="close-event-popup" onClick={() => setShowEventPopup(false)}>
              <i className="bx bx-x"></i>
            </button>
          </div>
        )}
        {events.map((event, index) => (
          <div className="event" key={index}>
            <div className="event-date-wrapper">
              <div 
                className="event-date"
                key={index}
                ref={eventRefs.current[event.date.toDateString()]}
                >{`${
                monthsOfYear[event.date.getMonth()]
              } ${event.date.getDate() + 1}, ${event.date.getFullYear()}`}</div>
              <div className="event-time">{event.startTime}</div>
              <div className="event-time">{event.endTime}</div>
              <div className="event-time">{event.totalTime}</div>
            </div>
            <div className="event-text">{event.notes}</div>
            <div className="event-buttons">
              <i className="bx bxs-edit-alt" onClick={() => handleEditEvent(event)}>EDIT</i>
              <i className="bx bxs-message-alt-x" onClick={() => handleDeleteEvent(event.id)}>DISPUTE</i>
              {eventId === event.id && showReplyBox ? 'Cancel' : 'Reply'}
            </div>
            {eventId === event.id && showReplyBox && (
            <form onSubmit={handleSubmit}>
                <input
                    className="form-input"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Think we made a mistake? Tell us!"
                    required
                />
                
                <button type="submit">Send Message</button>
                <br></br>

            </form>
        )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalendarApp

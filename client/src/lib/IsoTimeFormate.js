const isoTimeFormate =(dateTime) =>{
  const date = new Date(dateTime);
  const localTime = date.toLocaleTimeString ('en-US',{
    hour:"numeric",
    minute:"2-digit",
    hour12: true
  });
  return localTime; 
}
export default isoTimeFormate;

const menu= document.getElementById('hamburgermenu');
const navigation= document.getElementById('navigation');
window.addEventListener("DOMContentLoaded", async (e) => {
navigation.style.display="none";
    
});
menu.addEventListener('click', async (e) => {
    if(navigation.style.display==="none"){
        navigation.style.display="block";
    }
    else
        navigation.style.display="none";
    
})
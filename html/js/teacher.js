
const menu= document.getElementById('hamburgermenu');
const navigation= document.getElementById('navigation');
const classcontent = document.getElementById("classcontent");
window.addEventListener("DOMContentLoaded", async (e) => {
navigation.style.display="none";
classcontent.style.display="none";
    
});
menu.addEventListener('click', async (e) => {
    if(navigation.style.display==="none"){
        navigation.style.display="block";
    }
    else
        navigation.style.display="none";
    
})

const jhs1 = document.getElementById("JHS1");
jhs1.addEventListener("click", async (e) => {
    if(classcontent.style.display==="none"){
        classcontent.style.display="block";
    }
    else
        classcontent.style.display="none";
} );

const jhs2 = document.getElementById("JHS2");
jhs2.addEventListener("click", async (e) =>{
    if(classcontent.style.display==="none"){
        classcontent.style.display="block";
    }
    else
        classcontent.style.display="none";
});

const jhs3 = document.getElementById("JHS3");
jhs3.addEventListener("click", async (e) =>{
    if(classcontent.style.display==="none"){
        classcontent.style.display="block";
    }
    else
        classcontent.style.display="none";
})
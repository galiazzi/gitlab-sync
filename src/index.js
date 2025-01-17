const gitlab = require('./sync/gitlab.js');


var provider;


async function loadConfig(context) {
  const configStorage = await context.store.getItem('gitlab-sync:config');
  
    // Prompt for the configuration
    try {
      var config = await context.app.prompt(
      'GitLab - Settings', {
        label: 'JSON string',
        defaultValue: (configStorage !== 'undefined') ? configStorage : '{"api_url": "", "token": "", "id_project": "", "name_file": "", "ref": ""}',
        submitName: 'Save',
        cancelable: true,
      }
      );
    } catch (e) { return false }
  

    await context.store.setItem('gitlab-sync:config', config);
  
    return true;
 
}

function loadProvider(context){
  let configStorage = context.store.getItem('gitlab-sync:config') 
  


  configStorage.then( (value)=>{
    var configObject = JSON.parse(value);
    console.log("Loaded config", value)
    provider = new gitlab(context, configObject);
  }, ( err )=>{
    context.app.alert("Invalid JSON!", "Error: " + e.message);
    return false;
  });

 
  return true
}



async function update(context, models) {
  
    try {
      const message = 'Update collection insomnia';
      var messageCommit = await context.app.prompt(
      'GitLab - Message Commit', {
        label: 'Message Commit',
        defaultValue: message || '',
        submitName: 'Commit',
        cancelable: true,
      }
      );

      const data = await context.data.export.insomnia({
        includePrivate: false,
        format: 'json',
        workspace: models.workspace
      });

       const content = JSON.stringify(JSON.parse(data), null, 2);
       
     

       provider.update(content, messageCommit).then((response)=>{
        console.log(response);
          context.app.alert( 'GitLab - Push Collection', 'Process concluded' );
       }).catch((error) => {
        let errorToJson = error.toJSON();
        context.app.alert( 'GitLab - Push Collection Error', errorToJson.message );
        console.log(errorToJson);
      });
      

     
 
    } catch (e) { 
      await context.app.alert( `Collection update error for the project,`, e.message );
      return; 
    }
  
  
    return true;
 
}



module.exports.workspaceActions = [
  {
    label: 'GitLab - Settings',
    icon: 'fa-cogs',
    action: async (context, models) => {
      await loadConfig(context, true);
    },
  },
  {
    label: 'GitLab - Pull Collection',
    icon: 'fa-download',
    action: async (context, models) => {
    

      try{
        await loadProvider(context)
        const file = await provider.get();
        const content = JSON.stringify(file);
        await context.data.import.raw(content);
        await context.app.alert( 'GitLab - Pull Collection', 'Process concluded' );
      } catch (e) {
        await context.app.alert( `Collection query error for the project`, e.message );
        return;
      }
    },
  },
  {
    label: 'GitLab - Push Collection',
    icon: 'fa-upload',
    action: async (context, models) => {
 
      loadProvider(context);
      update(context, models);
     
    },
  }
];
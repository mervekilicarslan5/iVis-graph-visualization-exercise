"use strict";

document.addEventListener('DOMContentLoaded', function() {
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    layout: {
      name: 'cose-bilkent',
      animate: false,
      randomize: true,
       avoidOverlap: true,
      avoidOverlapPadding: 80
    },
    style: [ // the stylesheet for the graph
      {
        selector: 'node[label="Actor"]',
        style: {
          'background-color': '#9B30FF',
          'label': 'data(name)',
         ' font-size': '10px',
          'text-halign': 'center',
          'text-valign': 'center',
           'height': '70px',
        'width': '70px',
          //'shape':'roundrectangle'
          //'background-image': 'url(assets/actor.svg)'
           
        }
      },
      {
        selector: 'node[label="startw"]',
        style: {
          'background-color': '#ff0000',
          'label': 'data(name)',
          
        }
      },
      {
        selector: 'node[label="Movie"]',
        style: {
          'background-color': '#808000',
          'label': 'data(name)',
          ' font-size': '10px',
          'text-halign': 'center',
          'text-valign': 'center',
             //'shape':'roundrectangle'
           'height': '70px',
        'width': '70px',
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 5,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'label': 'data(label)',
          //'curve-style': 'bezier',
          //'control-point-distance': '100px',
          //'control-point-weight': '0.7', // '0': curve towards source node, '1': towards target node.
          //'label: { passthroughMapper: { attrName: "label" } }',
        }
      },
       {
        selector: ':selected',
        style: {
          'border-width': 10,
          'border-style': 'solid',
          'border-color': 'black'
        }
      }
    ]
  });

 cy.contextMenus({
    menuItems: [
      {
        id: 'showMoviesOfPerson',
        content: 'Show movies',
        tooltipText: 'show movies of person',
        selector: 'node[label="Actor"]',
        onClickFunction: function (event) {
          var target = event.target || event.cyTarget;
          console.log('target: ', target);
         addNeighborsOfNodeAsMovie(target);
        }
      },
      {
        id: 'showActorsOfMovie',
        content: 'Show actors',
        tooltipText: 'show actors of movie',
        selector: 'node[label="Movie"]',
        onClickFunction: function (event) {
          var target = event.target || event.cyTarget;
          console.log('target: ', target);
          addNeighborsOfNodeAsMovie(target);
        }
      }
    ]
  });
 //registerContextMenus();
 
  var url = 'bolt://localhost';
  var user = 'neo4j';
  var pass = '1122';
  window.neo4jdriver = neo4j.v1.driver(url, neo4j.v1.auth.basic(user, pass));
  var session = window.neo4jdriver.session();
  var maxLevel = 4;



  function addStartNode(name, maxLevel){
  session
    .run(`MATCH (p {name: "${name}"}) RETURN p`)
    .then(function(result){
      result.records.forEach(function(record){
        console.log(record._fields[0]);
        var level = 1;
       // cy.add(actorToCyEle(record._fields[0],0));
        cy.add({
        	data: {
          	 	name: record._fields[0].properties.name,
      			born: record._fields[0].properties.born,
            	id: record._fields[0].identity.low,   
            	//level:0,  
            	
             }
          });



        if(maxLevel>0)
          createGraph(level, name, record, maxLevel);
      })
    })
    .catch(function(err){
      console.log(err);
    });

  }



  function createGraph(level, name, target, maxLevel){
    session
      .run(`MATCH (p:Person {name: "${name}"})-[:ACTED_IN]->(movies) RETURN movies`)
      .then(function(result){
        result.records.forEach(function(record){
          if (cy.getElementById(record._fields[0].identity.low).empty()) {
            console.log(record._fields[0]);
            var title = record._fields[0].properties.title;
             cy.add({
          data: {
          name:record._fields[0].properties.title,
            id: record._fields[0].identity.low,  
             label: "Movie" ,
             level: level,
             
            //level: controlLevelForMovies      
          }
      });
            cy.add({
              data: {
                id: 'edge' + record._fields[0].identity.low + target._fields[0].identity.low ,
                  source: record._fields[0].identity.low,
                  target: target._fields[0].identity.low,
                  label: 'Acted in'
              },
            selectable: false
            });
            session.run(`MATCH (mov:Movie {title: "${title}"})<-[:ACTED_IN]-(acts) RETURN acts`)
            .then(function(result){
              result.records.forEach(function(record0){
                if (cy.getElementById(record0._fields[0].identity.low).empty()){
                  console.log(record0._fields[0]);
                  	cy.add({
          data: {
              name: record0._fields[0].properties.name,
            born: record0._fields[0].properties.born,
              id: record0._fields[0].identity.low,   
              level: level+1,
              label: "Actor"    
             }
                 // cy.add(actorToCyEle(record0._fields[0],level+1));
                });}
                if(cy.getElementById('edge' + record0._fields[0].identity.low + record._fields[0].identity.low).empty()){
                  cy.add({
                      data: {
                        id: 'edge' + record0._fields[0].identity.low + record._fields[0].identity.low,
                          source: record0._fields[0].identity.low,
                          target: record._fields[0].identity.low,
                          label: 'Acted in'
                      },
                    selectable: false
                  });
                }
                if(level < maxLevel * 2 -1){
                  createGraph(level+2, record0._fields[0].properties.name, record0, maxLevel);
                }
              }) 
            });
          }
        })
      })
      .catch(function(err){
        console.log(err);
      });
      
  }

  var concentricButton = document.getElementById('concentricButton');
  concentricButton.addEventListener('click', function() {
     var layout = cy.layout({
       name: 'cose-bilkent',
       animate: 'end',
      animationEasing: 'ease-out',
       animationDuration: 2000,
      randomize: true
    });
       layout.run();
   
  });

  var submitButton = document.getElementById('submitButton');
  submitButton.addEventListener('click', function() {
    cy.elements().remove();
    var userInput = document.getElementById('actName').value;
    var level = document.getElementById('number2').value;
    addStartNode(userInput, level);


  });

/*function registerContextMenus() {
  cy.contextMenus({



    menuItems: [
      {
        id: 'showMoviesOfPerson',
        content: 'show movies of person',
        tooltipText: 'show movies of person',
        selector: 'node[label="Actor"]',
        onClickFunction: function (event) {
          var target = event.target || event.cyTarget;
          console.log('target: ', target);
         // addNeighborsOfNode(target);
        }
      },
      {
        id: 'showActorsOfMovie',
        content: 'show actors of movie',
        tooltipText: 'show actors of movie',
        selector: 'node[label="Movie"]',
        onClickFunction: function (event) {
          var target = event.target || event.cyTarget;
          console.log('target: ', target);
         // addNeighborsOfNode(target);
        }
      }
    ]
  });
}
*/
function addNeighborsOfNodeAsMovie(node){
	console.log("click the actor to  see the movies");
	console.log(node._private.data.name);
       session.run(`MATCH (p:Person {name: "${node._private.data.name}"})-[:ACTED_IN]->(movies) RETURN movies`)
      // `MATCH (p:Person {name: "${node._private.data.title}"})-[:ACTED_IN]->(movies) RETURN movies`
           .then(function(result){
        result.records.forEach(function(record){
          if (cy.getElementById(record._fields[0].identity.low).empty()) {

            console.log(record._fields[0]);
            var title = record._fields[0].properties.title;
             cy.add({
          data: {
          name:record._fields[0].properties.title,
            id: record._fields[0].identity.low,  
             label: "Movie" ,
             //level: level
            //level: controlLevelForMovies      
          }
      });
            cy.add({
              data: {
                id: 'edge' + record._fields[0].identity.low + node._private.data.id ,
                  source: record._fields[0].identity.low,
                  target: node._private.data.id
              },
            selectable: false
            });
}
});
    } );
}
});

